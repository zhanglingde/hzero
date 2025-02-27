/*******************************************************************************
 * Copyright 2017 Bstek
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License.  You may obtain a copy
 * of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 * License for the specific language governing permissions and limitations under
 * the License.
 ******************************************************************************/
package com.bstek.ureport.console.designer;

import java.io.IOException;
import java.io.InputStream;
import java.io.PrintWriter;
import java.util.*;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.bstek.ureport.cache.CacheUtils;
import com.bstek.ureport.console.RenderPageServletAction;
import com.bstek.ureport.console.cache.TempObjectCache;
import com.bstek.ureport.console.exception.ReportDesignException;
import com.bstek.ureport.definition.ReportDefinition;
import com.bstek.ureport.dsl.ReportParserLexer;
import com.bstek.ureport.dsl.ReportParserParser;
import com.bstek.ureport.dsl.ReportParserParser.DatasetContext;
import com.bstek.ureport.export.ReportRender;
import com.bstek.ureport.expression.ErrorInfo;
import com.bstek.ureport.expression.ScriptErrorListener;
import com.bstek.ureport.parser.ReportParser;
import com.bstek.ureport.provider.report.ReportProvider;
import com.bstek.ureport.provider.report.file.FileReportProvider;
import org.antlr.v4.runtime.ANTLRInputStream;
import org.antlr.v4.runtime.CommonTokenStream;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.velocity.Template;
import org.apache.velocity.VelocityContext;
import org.hzero.core.base.BaseConstants;
import org.hzero.core.message.MessageAccessor;
import org.hzero.report.domain.entity.Report;
import org.hzero.report.domain.repository.ReportRepository;
import org.hzero.report.infra.util.UReportUtils;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.util.Assert;

import io.choerodon.core.convertor.ApplicationContextHelper;

/**
 * @author Jacky.gao
 * @since 2017年1月25日
 */
public class DesignerServletAction extends RenderPageServletAction {
    private ReportRender reportRender;
    private ReportParser reportParser;
    private List<ReportProvider> reportProviders = new ArrayList<ReportProvider>();


    private volatile static ReportRepository reportRepository;

    private ReportRepository getReportRepository() {
        if (null == reportRepository) {
            synchronized (DesignerServletAction.class) {
                if (null == reportRepository) {
                    reportRepository = ApplicationContextHelper.getContext().getBean(ReportRepository.class);
                }
            }
        }
        return reportRepository;
    }

    @Override
    public void execute(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String method = retriveMethod(req);
        if (method != null) {
            invokeMethod(method, req, resp);
        } else {
            // ============================ change by shuangfei.zhu@hand-china.com  禁止非hzero系统请求设计器页面
            String uuid = UReportUtils.getParamsWithQueryString(req.getQueryString(), "uuid");
            if (StringUtils.isBlank(uuid)) {
                // 校验是否是系统内的转发请求
                return;
            }
            // =============================
            VelocityContext context = new VelocityContext();
            context.put("contextPath", req.getContextPath());
            context.put("reportUuid", uuid);
            resp.setContentType("text/html");
            resp.setCharacterEncoding("utf-8");
            Template template = ve.getTemplate("ureport-html/designer.html", "utf-8");
            PrintWriter writer = resp.getWriter();
            template.merge(context, writer);
            writer.close();
        }
    }

    public void scriptValidation(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String content = req.getParameter("content");
        ANTLRInputStream antlrInputStream = new ANTLRInputStream(content);
        ReportParserLexer lexer = new ReportParserLexer(antlrInputStream);
        CommonTokenStream tokenStream = new CommonTokenStream(lexer);
        ReportParserParser parser = new ReportParserParser(tokenStream);
        ScriptErrorListener errorListener = new ScriptErrorListener();
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);
        parser.expression();
        List<ErrorInfo> infos = errorListener.getInfos();
        writeObjectToJson(resp, infos);
    }

    public void conditionScriptValidation(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String content = req.getParameter("content");
        ANTLRInputStream antlrInputStream = new ANTLRInputStream(content);
        ReportParserLexer lexer = new ReportParserLexer(antlrInputStream);
        CommonTokenStream tokenStream = new CommonTokenStream(lexer);
        ReportParserParser parser = new ReportParserParser(tokenStream);
        ScriptErrorListener errorListener = new ScriptErrorListener();
        parser.removeErrorListeners();
        parser.addErrorListener(errorListener);
        parser.expr();
        List<ErrorInfo> infos = errorListener.getInfos();
        writeObjectToJson(resp, infos);
    }


    public void parseDatasetName(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String expr = req.getParameter("expr");
        ANTLRInputStream antlrInputStream = new ANTLRInputStream(expr);
        ReportParserLexer lexer = new ReportParserLexer(antlrInputStream);
        CommonTokenStream tokenStream = new CommonTokenStream(lexer);
        ReportParserParser parser = new ReportParserParser(tokenStream);
        parser.removeErrorListeners();
        DatasetContext ctx = parser.dataset();
        String datasetName = ctx.Identifier().getText();
        Map<String, String> result = new HashMap<String, String>();
        result.put("datasetName", datasetName);
        writeObjectToJson(resp, result);
    }

    public void savePreviewData(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String content = req.getParameter("content");
        content = decodeContent(content);
        InputStream inputStream = IOUtils.toInputStream(content, "utf-8");
        ReportDefinition reportDef = reportParser.parse(inputStream, "p");
        reportRender.rebuildReportDefinition(reportDef);
        IOUtils.closeQuietly(inputStream);
        TempObjectCache.putObject(PREVIEW_KEY, reportDef);
    }

    public void loadReport(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // ==============================================  change by shuangfei.zhu@hand-china.com
        String file;
        String uuid = req.getParameter("file");
        ReportDefinition def = UReportUtils.getCache(uuid);
        if (def != null) {
            // 读取上传的报表模板
            UReportUtils.removeCache(uuid);
            writeObjectToJson(resp, new ReportDefinitionWrapper(def));
            return;
        }
        Assert.notNull(uuid, MessageAccessor.getMessage(BaseConstants.ErrorCode.NOT_NULL).desc());
        Report report = getReportRepository().selectOne(new Report().setReportUuid(uuid));
        if (report == null) {
            throw new ReportDesignException("Report file can not be null.");
        }
        file = FileReportProvider.PREFIX + report.getReportCode();
//        String file = req.getParameter("file");
//        if (file == null) {
//            throw new ReportDesignException("Report file can not be null.");
//        }
//        file = ReportUtils.decodeFileName(file);
        // ===============================================
        Object obj = TempObjectCache.getObject(file);
        if (obj instanceof ReportDefinition) {
            ReportDefinition reportDef = (ReportDefinition) obj;
            TempObjectCache.removeObject(file);
            writeObjectToJson(resp, new ReportDefinitionWrapper(reportDef));
        } else {
            ReportDefinition reportDef = reportRender.parseReport(file);
            writeObjectToJson(resp, new ReportDefinitionWrapper(reportDef));
        }
    }

    public void deleteReportFile(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // ==============================================  change by shuangfei.zhu@hand-china.com  禁止删除
//        String file = req.getParameter("file");
//        if (file == null) {
//            throw new ReportDesignException("Report file can not be null.");
//        }
//        ReportProvider targetReportProvider = null;
//        for (ReportProvider provider : reportProviders) {
//            if (file.startsWith(provider.getPrefix())) {
//                targetReportProvider = provider;
//                break;
//            }
//        }
//        if (targetReportProvider == null) {
//            throw new ReportDesignException("File [" + file + "] not found available report provider.");
//        }
//        targetReportProvider.deleteReport(file);
        // ===============================================
    }


    public void saveReportFile(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        // ==============================================  change by shuangfei.zhu@hand-china.com
        String file;
        String uuid = req.getParameter("file");
        Report report = getReportRepository().selectOne(new Report().setReportUuid(uuid));
        if (report == null) {
            throw new ReportDesignException("Report file can not be null.");
        }
        file = FileReportProvider.PREFIX + report.getReportCode();
//        String file = req.getParameter("file");
//        if (file == null) {
//            throw new ReportDesignException("Report file can not be null.");
//        }
//        file = ReportUtils.decodeFileName(file);
        // ===============================================

        String content = req.getParameter("content");
        content = decodeContent(content);
        ReportProvider targetReportProvider = null;
        for (ReportProvider provider : reportProviders) {
            if (file.startsWith(provider.getPrefix())) {
                targetReportProvider = provider;
                break;
            }
        }
        if (targetReportProvider == null) {
            throw new ReportDesignException("File [" + file + "] not found available report provider.");
        }
        targetReportProvider.saveReport(file, content);
        InputStream inputStream = IOUtils.toInputStream(content, "utf-8");
        ReportDefinition reportDef = reportParser.parse(inputStream, file);
        reportRender.rebuildReportDefinition(reportDef);
        CacheUtils.cacheReportDefinition(file, reportDef);
        IOUtils.closeQuietly(inputStream);
    }

    public void loadReportProviders(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        writeObjectToJson(resp, reportProviders);
    }

    public void setReportRender(ReportRender reportRender) {
        this.reportRender = reportRender;
    }

    public void setReportParser(ReportParser reportParser) {
        this.reportParser = reportParser;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        super.setApplicationContext(applicationContext);
        Collection<ReportProvider> providers = applicationContext.getBeansOfType(ReportProvider.class).values();
        for (ReportProvider provider : providers) {
            if (provider.disabled() || provider.getName() == null) {
                continue;
            }
            reportProviders.add(provider);
        }
    }

    @Override
    public String url() {
        return "/designer";
    }
}
