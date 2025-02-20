/**
 * ocr-record 识别记录
 * @date: 2019-9-3
 * @author: xl <liang.xiong@hand-china.com>
 * @copyright Copyright (c) 2018, Hand
 */
import React from 'react';
import Viewer from 'react-viewer';
import 'react-viewer/dist/index.css';
import { Form, Card, Row, Col, Divider, Spin, Button } from 'hzero-ui';
import { connect } from 'dva';
import { Bind } from 'lodash-decorators';

import { Content, Header } from 'components/Page';

import intl from 'utils/intl';
import { BKT_OCR } from 'utils/config';
import {
  DETAIL_CARD_CLASSNAME,
  EDIT_FORM_ITEM_LAYOUT,
  EDIT_FORM_ROW_LAYOUT,
  FORM_COL_3_LAYOUT,
} from 'utils/constants';

@connect(({ ocrRecord, loading }) => ({
  ocrRecord,
  fetchOcrTaxiDetailLoading: loading.effects['ocrRecord/fetchTaxiDetail'],
  redirectImageLoading: loading.effects['ocrRecord/redirect'],
}))
@Form.create({ fieldNameProp: null })
export default class QuotaDetail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      quotaUrl: '',
      previewImages: '',
      previewVisible: '',
    };
  }

  componentDidMount() {
    const {
      dispatch,
      match: {
        params: { recordDetailId, resourceUrl1 },
      },
    } = this.props;
    dispatch({
      type: 'ocrRecord/updateState',
      payload: {
        quotaDetail: {},
      },
    });
    dispatch({
      type: 'ocrRecord/fetchQuotaDetail',
      payload: {
        recordDetailId,
      },
    });
    dispatch({
      type: 'ocrRecord/redirect',
      payload: {
        bucketName: BKT_OCR,
        directory: 'hocr01',
        url: resourceUrl1,
      },
    }).then(item => {
      this.setState({
        quotaUrl: item,
      });
    });
  }

  // 识别结果图预览
  @Bind()
  handlePreviewImg() {
    const { quotaUrl } = this.state;
    this.setState({
      previewImages: [
        {
          src: quotaUrl,
          alt: '',
        },
      ],
      previewVisible: true,
    });
  }

  /**
   * 取消预览
   */
  @Bind()
  handlePreviewCancel() {
    this.setState({
      previewImages: [],
      previewVisible: false,
    });
  }

  render() {
    const {
      ocrRecord: { quotaDetail = {} },
      redirectImageLoading,
    } = this.props;
    const { previewVisible, previewImages } = this.state;
    return (
      <>
        <Header
          title={intl.get('hocr.ocrRecord.view.title.quotaDetail').d('定额发票详情')}
          backPath="/hocr/ocr-record/list"
        >
          <Button
            icon="eye"
            type="primary"
            onClick={this.handlePreviewImg}
            loading={redirectImageLoading}
          >
            {intl.get('hzero.common.button.see').d('预览')}
          </Button>
        </Header>
        <Content>
          <Viewer
            noImgDetails
            noNavbar
            scalable={false}
            changeable={false}
            visible={previewVisible}
            onClose={this.handlePreviewCancel}
            images={previewImages}
          />
          <Card
            key="vat-detail"
            bordered={false}
            className={DETAIL_CARD_CLASSNAME}
            title={<h3>{intl.get('hocr.ocrRecord.view.title.quotaDetail').d('定额发票详情')}</h3>}
          >
            <Spin spinning={false}>
              <Row {...EDIT_FORM_ROW_LAYOUT}>
                <Col {...FORM_COL_3_LAYOUT}>
                  <Form.Item
                    label={intl.get('hocr.ocrRecord.model.ocrRecord.code').d('发票代码')}
                    {...EDIT_FORM_ITEM_LAYOUT}
                  >
                    <span>{quotaDetail.code}</span>
                  </Form.Item>
                </Col>
                <Col {...FORM_COL_3_LAYOUT}>
                  <Form.Item
                    label={intl.get('hocr.ocrRecord.model.ocrRecord.number').d('发票号码')}
                    {...EDIT_FORM_ITEM_LAYOUT}
                  >
                    <span>{quotaDetail.number}</span>
                  </Form.Item>
                </Col>
                <Col {...FORM_COL_3_LAYOUT}>
                  <Form.Item
                    label={intl.get('hocr.ocrRecord.model.ocrRecord.amount').d('金额')}
                    {...EDIT_FORM_ITEM_LAYOUT}
                  >
                    <span>{quotaDetail.amount}</span>
                  </Form.Item>
                </Col>
              </Row>
              <Row {...EDIT_FORM_ROW_LAYOUT}>
                <Col {...FORM_COL_3_LAYOUT}>
                  <Form.Item
                    label={intl.get('hocr.ocrRecord.model.ocrRecord.location').d('地址')}
                    {...EDIT_FORM_ITEM_LAYOUT}
                  >
                    <span>{quotaDetail.location}</span>
                  </Form.Item>
                </Col>
              </Row>
              <Divider />
            </Spin>
          </Card>
        </Content>
      </>
    );
  }
}
