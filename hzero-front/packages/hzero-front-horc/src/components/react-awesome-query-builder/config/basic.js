import React from 'react';
import * as Widgets from '../components/widgets';
import * as Operators from '../components/operators';
import { SqlString } from '../utils/sql';
import { escapeRegExp, getTitleInListValues } from '../utils/stuff';
import moment from 'moment';
import { settings as defaultSettings } from '../config/default';

const {
  //vanilla
  VanillaBooleanWidget,
  VanillaTextWidget,
  VanillaDateWidget,
  VanillaTimeWidget,
  VanillaDateTimeWidget,
  VanillaMultiSelectWidget,
  VanillaSelectWidget,
  VanillaNumberWidget,
  VanillaSliderWidget,

  //common
  ValueFieldWidget,
  FuncWidget,
} = Widgets;
const { ProximityOperator } = Operators;

//----------------------------  conjunctions

const conjunctions = {
  AND: {
    label: 'And',
    mongoConj: '$and',
    reversedConj: 'OR',
    formatConj: (children, conj, not, isForDisplay) => {
      return children.size > 1
        ? (not ? 'NOT ' : '') + '(' + children.join(' ' + (isForDisplay ? 'AND' : '&&') + ' ') + ')'
        : (not ? 'NOT (' : '') + children.first() + (not ? ')' : '');
    },
    sqlFormatConj: (children, conj, not) => {
      return children.size > 1
        ? (not ? 'NOT ' : '') + '(' + children.join(' ' + 'AND' + ' ') + ')'
        : (not ? 'NOT (' : '') + children.first() + (not ? ')' : '');
    },
  },
  OR: {
    label: 'Or',
    mongoConj: '$or',
    reversedConj: 'AND',
    formatConj: (children, conj, not, isForDisplay) => {
      return children.size > 1
        ? (not ? 'NOT ' : '') + '(' + children.join(' ' + (isForDisplay ? 'OR' : '||') + ' ') + ')'
        : (not ? 'NOT (' : '') + children.first() + (not ? ')' : '');
    },
    sqlFormatConj: (children, conj, not) => {
      return children.size > 1
        ? (not ? 'NOT ' : '') + '(' + children.join(' ' + 'OR' + ' ') + ')'
        : (not ? 'NOT (' : '') + children.first() + (not ? ')' : '');
    },
  },
};

//----------------------------  operators

// helpers for mongo format
const mongoFormatOp1 = (mop, mc, not, field, _op, value, useExpr) => {
  const mv = mc(value);
  if (mv === undefined) return undefined;
  if (not) {
    return !useExpr ? { [field]: { $not: { [mop]: mv } } } : { $not: { [mop]: ['$' + field, mv] } };
  } else {
    if (!useExpr && mop == '$eq') return { [field]: mv }; // short form
    return !useExpr ? { [field]: { [mop]: mv } } : { [mop]: ['$' + field, mv] };
  }
};

const mongoFormatOp2 = (mops, not, field, _op, values, useExpr) => {
  if (not) {
    return !useExpr
      ? { [field]: { $not: { [mops[0]]: values[0], [mops[1]]: values[1] } } }
      : {
          $not: {
            $and: [
              { [mops[0]]: ['$' + field, values[0]] },
              { [mops[1]]: ['$' + field, values[1]] },
            ],
          },
        };
  } else {
    return !useExpr
      ? { [field]: { [mops[0]]: values[0], [mops[1]]: values[1] } }
      : {
          $and: [{ [mops[0]]: ['$' + field, values[0]] }, { [mops[1]]: ['$' + field, values[1]] }],
        };
  }
};

const operators = {
  equal: {
    label: '==',
    labelForFormat: '==',
    sqlOp: '=',
    reversedOp: 'not_equal',
    formatOp: (
      field,
      op,
      value,
      valueSrcs,
      valueTypes,
      opDef,
      operatorOptions,
      isForDisplay,
      fieldDef
    ) => {
      if (valueTypes == 'boolean' && isForDisplay)
        return value == 'No' ? `NOT ${field}` : `${field}`;
      else return `${field} ${opDef.label} ${value}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$eq', (v) => v, false),
    jsonLogic: '==',
  },
  not_equal: {
    label: '!=',
    labelForFormat: '!=',
    sqlOp: '<>',
    reversedOp: 'equal',
    formatOp: (
      field,
      op,
      value,
      valueSrcs,
      valueTypes,
      opDef,
      operatorOptions,
      isForDisplay,
      fieldDef
    ) => {
      if (valueTypes == 'boolean' && isForDisplay)
        return value == 'No' ? `${field}` : `NOT ${field}`;
      else return `${field} ${opDef.label} ${value}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$ne', (v) => v, false),
    jsonLogic: '!=',
  },
  less: {
    label: '<',
    labelForFormat: '<',
    sqlOp: '<',
    reversedOp: 'greater_or_equal',
    mongoFormatOp: mongoFormatOp1.bind(null, '$lt', (v) => v, false),
    jsonLogic: '<',
  },
  less_or_equal: {
    label: '<=',
    labelForFormat: '<=',
    sqlOp: '<=',
    reversedOp: 'greater',
    mongoFormatOp: mongoFormatOp1.bind(null, '$lte', (v) => v, false),
    jsonLogic: '<=',
  },
  greater: {
    label: '>',
    labelForFormat: '>',
    sqlOp: '>',
    reversedOp: 'less_or_equal',
    mongoFormatOp: mongoFormatOp1.bind(null, '$gt', (v) => v, false),
    jsonLogic: '>',
  },
  greater_or_equal: {
    label: '>=',
    labelForFormat: '>=',
    sqlOp: '>=',
    reversedOp: 'less',
    mongoFormatOp: mongoFormatOp1.bind(null, '$gte', (v) => v, false),
    jsonLogic: '>=',
  },
  like: {
    label: 'Like',
    labelForFormat: 'Like',
    reversedOp: 'not_like',
    sqlOp: 'LIKE',
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value') {
        return `${field} LIKE ${values}`;
      } else return undefined; // not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(
      null,
      '$regex',
      (v) => (typeof v == 'string' ? escapeRegExp(v) : undefined),
      false
    ),
    //jsonLogic: (field, op, val) => ({ "in": [val, field] }),
    jsonLogic: 'in',
    _jsonLogicIsRevArgs: true,
    valueSources: ['value'],
  },
  not_like: {
    label: 'Not like',
    reversedOp: 'like',
    labelForFormat: 'Not Like',
    sqlOp: 'NOT LIKE',
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value') {
        return `${field} NOT LIKE ${values}`;
      } else return undefined; // not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(
      null,
      '$regex',
      (v) => (typeof v == 'string' ? escapeRegExp(v) : undefined),
      true
    ),
    valueSources: ['value'],
  },
  starts_with: {
    label: 'Starts with',
    labelForFormat: 'Starts with',
    sqlOp: 'LIKE',
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value') {
        return `${field} LIKE ${values}`;
      } else return undefined; // not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(
      null,
      '$regex',
      (v) => (typeof v == 'string' ? '^' + escapeRegExp(v) : undefined),
      false
    ),
    jsonLogic: undefined, // not supported
    valueSources: ['value'],
  },
  ends_with: {
    label: 'Ends with',
    labelForFormat: 'Ends with',
    sqlOp: 'LIKE',
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value') {
        return `${field} LIKE ${values}`;
      } else return undefined; // not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(
      null,
      '$regex',
      (v) => (typeof v == 'string' ? escapeRegExp(v) + '$' : undefined),
      false
    ),
    jsonLogic: undefined, // not supported
    valueSources: ['value'],
  },
  between: {
    label: 'Between',
    labelForFormat: 'BETWEEN',
    sqlOp: 'BETWEEN',
    cardinality: 2,
    formatOp: (field, op, values, valueSrcs, valueTypes, opDef, operatorOptions, isForDisplay) => {
      let valFrom = values.first();
      let valTo = values.get(1);
      if (isForDisplay) return `${field} >= ${valFrom} AND ${field} <= ${valTo}`;
      else return `${field} >= ${valFrom} && ${field} <= ${valTo}`;
    },
    mongoFormatOp: mongoFormatOp2.bind(null, ['$gte', '$lte'], false),
    valueLabels: ['Value from', 'Value to'],
    textSeparators: [null, 'and'],
    reversedOp: 'not_between',
    jsonLogic: '<=',
    validateValues: (values) => {
      if (values[0] != undefined && values[1] != undefined) {
        return values[0] <= values[1] ? null : 'Invalid range';
      }
      return null;
    },
  },
  not_between: {
    label: 'Not between',
    labelForFormat: 'NOT BETWEEN',
    sqlOp: 'NOT BETWEEN',
    cardinality: 2,
    mongoFormatOp: mongoFormatOp2.bind(null, ['$gte', '$lte'], true),
    valueLabels: ['Value from', 'Value to'],
    textSeparators: [null, 'and'],
    reversedOp: 'between',
    validateValues: (values) => {
      if (values[0] != undefined && values[1] != undefined) {
        return values[0] <= values[1] ? null : 'Invalid range';
      }
      return null;
    },
  },
  is_empty: {
    label: 'Is empty',
    labelForFormat: 'IS EMPTY',
    sqlOp: 'IS EMPTY',
    cardinality: 0,
    reversedOp: 'is_not_empty',
    formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      return isForDisplay ? `${field} IS EMPTY` : `!${field}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$exists', (v) => false, false),
    jsonLogic: '!',
  },
  is_not_empty: {
    label: 'Is not empty',
    labelForFormat: 'IS NOT EMPTY',
    sqlOp: 'IS NOT EMPTY',
    cardinality: 0,
    reversedOp: 'is_empty',
    formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      return isForDisplay ? `${field} IS NOT EMPTY` : `!!${field}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$exists', (v) => true, false),
    jsonLogic: '!!',
  },
  select_equals: {
    label: '==',
    labelForFormat: '==',
    sqlOp: '=', // enum/set
    formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      return `${field} == ${value}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$eq', (v) => v, false),
    reversedOp: 'select_not_equals',
    jsonLogic: '==',
  },
  select_not_equals: {
    label: '!=',
    labelForFormat: '!=',
    sqlOp: '<>', // enum/set
    formatOp: (field, op, value, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      return `${field} != ${value}`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$ne', (v) => v, false),
    reversedOp: 'select_equals',
    jsonLogic: '!=',
  },
  select_any_in: {
    label: 'Any in',
    labelForFormat: 'IN',
    sqlOp: 'IN',
    formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      if (valueSrc == 'value') return `${field} IN (${values.join(', ')})`;
      else return `${field} IN (${values})`;
    },
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      return `${field} IN (${values.join(', ')})`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$in', (v) => v, false),
    reversedOp: 'select_not_any_in',
    jsonLogic: 'in',
  },
  select_not_any_in: {
    label: 'Not in',
    labelForFormat: 'NOT IN',
    sqlOp: 'NOT IN',
    formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      if (valueSrc == 'value') return `${field} NOT IN (${values.join(', ')})`;
      else return `${field} NOT IN (${values})`;
    },
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      return `${field} NOT IN (${values.join(', ')})`;
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$nin', (v) => v, false),
    reversedOp: 'select_any_in',
  },
  multiselect_equals: {
    label: 'Equals',
    labelForFormat: '==',
    sqlOp: '=',
    formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      if (valueSrc == 'value') return `${field} == [${values.join(', ')}]`;
      else return `${field} == ${values}`;
    },
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value')
        // set
        return `${field} = '${values.map((v) => SqlString.trim(v)).join(',')}'`;
      else return undefined; //not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$eq', (v) => v, false),
    reversedOp: 'multiselect_not_equals',
    jsonLogic2: 'all-in',
    jsonLogic: (field, op, vals) => ({
      // it's not "equals", but "includes" operator - just for example
      all: [field, { in: [{ var: '' }, vals] }],
    }),
  },
  multiselect_not_equals: {
    label: 'Not equals',
    labelForFormat: '!=',
    sqlOp: '<>',
    formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      if (valueSrc == 'value') return `${field} != [${values.join(', ')}]`;
      else return `${field} != ${values}`;
    },
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      if (valueSrc == 'value')
        // set
        return `${field} != '${values.map((v) => SqlString.trim(v)).join(',')}'`;
      else return undefined; //not supported
    },
    mongoFormatOp: mongoFormatOp1.bind(null, '$ne', (v) => v, false),
    reversedOp: 'multiselect_equals',
  },
  proximity: {
    label: 'Proximity search',
    cardinality: 2,
    valueLabels: [
      { label: 'Word 1', placeholder: 'Enter first word' },
      { label: 'Word 2', placeholder: 'Enter second word' },
    ],
    textSeparators: [
      //'Word 1',
      //'Word 2'
    ],
    formatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions, isForDisplay) => {
      const val1 = values.first();
      const val2 = values.get(1);
      const prox = operatorOptions.get('proximity');
      return `${field} ${val1} NEAR/${prox} ${val2}`;
    },
    sqlFormatOp: (field, op, values, valueSrc, valueType, opDef, operatorOptions) => {
      const val1 = values.first();
      const val2 = values.get(1);
      const _val1 = SqlString.trim(val1);
      const _val2 = SqlString.trim(val2);
      const prox = operatorOptions.get('proximity');
      return `CONTAINS(${field}, 'NEAR((${_val1}, ${_val2}), ${prox})')`;
    },
    mongoFormatOp: undefined, // not supported
    jsonLogic: undefined, // not supported
    options: {
      optionLabel: 'Near', // label on top of "near" selectbox (for config.settings.showLabels==true)
      optionTextBefore: 'Near', // label before "near" selectbox (for config.settings.showLabels==false)
      optionPlaceholder: 'Select words between', // placeholder for "near" selectbox
      factory: (props) => <ProximityOperator {...props} />,
      minProximity: 2,
      maxProximity: 10,
      defaults: {
        proximity: 2,
      },
    },
  },
};

//----------------------------  widgets

const widgets = {
  text: {
    type: 'text',
    jsType: 'string',
    valueSrc: 'value',
    valueLabel: 'String',
    valuePlaceholder: 'Enter string',
    factory: (props) => <VanillaTextWidget {...props} />,
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      return isForDisplay ? '"' + val + '"' : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      if (opDef.sqlOp == 'LIKE' || opDef.sqlOp == 'NOT LIKE') {
        return SqlString.escapeLike(val, op != 'starts_with', op != 'ends_with');
      } else {
        return SqlString.escape(val);
      }
    },
    toJS: (val, fieldSettings) => val,
  },
  number: {
    type: 'number',
    jsType: 'number',
    valueSrc: 'value',
    factory: (props) => <VanillaNumberWidget {...props} />,
    valueLabel: 'Number',
    valuePlaceholder: 'Enter number',
    valueLabels: [
      { label: 'Number from', placeholder: 'Enter number from' },
      { label: 'Number to', placeholder: 'Enter number to' },
    ],
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      return isForDisplay ? val : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      return SqlString.escape(val);
    },
    toJS: (val, fieldSettings) => val,
  },
  slider: {
    type: 'number',
    jsType: 'number',
    valueSrc: 'value',
    factory: (props) => <VanillaSliderWidget {...props} />,
    valueLabel: 'Number',
    valuePlaceholder: 'Enter number or move slider',
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      return isForDisplay ? val : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      return SqlString.escape(val);
    },
    toJS: (val, fieldSettings) => val,
  },
  select: {
    type: 'select',
    jsType: 'string',
    valueSrc: 'value',
    factory: (props) => <VanillaSelectWidget {...props} />,
    valueLabel: 'Value',
    valuePlaceholder: 'Select value',
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      let valLabel = getTitleInListValues(fieldDef.fieldSettings.listValues, val);
      return isForDisplay ? '"' + valLabel + '"' : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      return SqlString.escape(val);
    },
    toJS: (val, fieldSettings) => val,
  },
  multiselect: {
    type: 'multiselect',
    jsType: 'array',
    valueSrc: 'value',
    factory: (props) => <VanillaMultiSelectWidget {...props} />,
    valueLabel: 'Values',
    valuePlaceholder: 'Select values',
    formatValue: (vals, fieldDef, wgtDef, isForDisplay) => {
      let valsLabels = vals.map((v) => getTitleInListValues(fieldDef.fieldSettings.listValues, v));
      return isForDisplay
        ? valsLabels.map((v) => '"' + v + '"')
        : vals.map((v) => JSON.stringify(v));
    },
    sqlFormatValue: (vals, fieldDef, wgtDef, op, opDef) => {
      return vals.map((v) => SqlString.escape(v));
    },
    toJS: (val, fieldSettings) => val,
  },
  date: {
    type: 'date',
    jsType: 'string',
    valueSrc: 'value',
    factory: (props) => <VanillaDateWidget {...props} />,
    dateFormat: 'DD.MM.YYYY',
    valueFormat: 'YYYY-MM-DD',
    valueLabel: 'Date',
    valuePlaceholder: 'Enter date',
    valueLabels: [
      { label: 'Date from', placeholder: 'Enter date from' },
      { label: 'Date to', placeholder: 'Enter date to' },
    ],
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return isForDisplay ? '"' + dateVal.format(wgtDef.dateFormat) + '"' : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return SqlString.escape(dateVal.format('YYYY-MM-DD'));
    },
    jsonLogic: (val, fieldDef, wgtDef) => moment(val, wgtDef.valueFormat).toDate(),
    toJS: (val, fieldSettings) => {
      const dateVal = moment(val, fieldSettings.valueFormat);
      return dateVal.isValid() ? dateVal.toDate() : undefined;
    },
  },
  time: {
    type: 'time',
    jsType: 'string',
    valueSrc: 'value',
    factory: (props) => <VanillaTimeWidget {...props} />,
    timeFormat: 'HH:mm',
    valueFormat: 'HH:mm:ss',
    valueLabel: 'Time',
    valuePlaceholder: 'Enter time',
    valueLabels: [
      { label: 'Time from', placeholder: 'Enter time from' },
      { label: 'Time to', placeholder: 'Enter time to' },
    ],
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return isForDisplay ? '"' + dateVal.format(wgtDef.timeFormat) + '"' : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return SqlString.escape(dateVal.format('HH:mm:ss'));
    },
    jsonLogic: (val, fieldDef, wgtDef) => {
      // return seconds of day
      const dateVal = moment(val, wgtDef.valueFormat);
      return dateVal.get('hour') * 60 * 60 + dateVal.get('minute') * 60 + dateVal.get('second');
    },
    toJS: (val, fieldSettings) => {
      // return seconds of day
      const dateVal = moment(val, fieldSettings.valueFormat);
      return dateVal.isValid()
        ? dateVal.get('hour') * 60 * 60 + dateVal.get('minute') * 60 + dateVal.get('second')
        : undefined;
    },
  },
  datetime: {
    type: 'datetime',
    jsType: 'string',
    valueSrc: 'value',
    factory: (props) => <VanillaDateTimeWidget {...props} />,
    timeFormat: 'HH:mm',
    dateFormat: 'DD.MM.YYYY',
    valueFormat: 'YYYY-MM-DD HH:mm:ss',
    valueLabel: 'Datetime',
    valuePlaceholder: 'Enter datetime',
    valueLabels: [
      { label: 'Datetime from', placeholder: 'Enter datetime from' },
      { label: 'Datetime to', placeholder: 'Enter datetime to' },
    ],
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return isForDisplay
        ? '"' + dateVal.format(wgtDef.dateFormat + ' ' + wgtDef.timeFormat) + '"'
        : JSON.stringify(val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      const dateVal = moment(val, wgtDef.valueFormat);
      return SqlString.escape(dateVal.toDate());
    },
    jsonLogic: (val, fieldDef, wgtDef) => moment(val, wgtDef.valueFormat).toDate(),
    toJS: (val, fieldSettings) => {
      const dateVal = moment(val, fieldSettings.valueFormat);
      return dateVal.isValid() ? dateVal.toDate() : undefined;
    },
  },
  boolean: {
    type: 'boolean',
    jsType: 'boolean',
    valueSrc: 'value',
    factory: (props) => <VanillaBooleanWidget {...props} />,
    labelYes: 'Yes',
    labelNo: 'No',
    formatValue: (val, fieldDef, wgtDef, isForDisplay) => {
      return isForDisplay ? (val ? 'Yes' : 'No') : JSON.stringify(!!val);
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef) => {
      return SqlString.escape(val);
    },
    defaultValue: false,
    toJS: (val, fieldSettings) => val,
  },
  field: {
    valueSrc: 'field',
    factory: (props) => <ValueFieldWidget {...props} />,
    formatValue: (val, fieldDef, wgtDef, isForDisplay, op, opDef, rightFieldDef) => {
      return isForDisplay ? rightFieldDef.label || val : val;
    },
    sqlFormatValue: (val, fieldDef, wgtDef, op, opDef, rightFieldDef) => {
      return val;
    },
    valueLabel: 'Field to compare',
    valuePlaceholder: 'Select field to compare',
    customProps: {
      showSearch: true,
    },
  },
  func: {
    valueSrc: 'func',
    factory: (props) => <FuncWidget {...props} />,
    valueLabel: 'Function',
    valuePlaceholder: 'Select function',
    customProps: {
      //showSearch: true
    },
  },
};

//----------------------------  types

const types = {
  text: {
    defaultOperator: 'equal',
    widgets: {
      text: {
        operators: [
          'equal',
          'not_equal',
          'is_empty',
          'is_not_empty',
          'like',
          'not_like',
          'starts_with',
          'ends_with',
          'proximity',
        ],
        widgetProps: {},
        opProps: {},
      },
      field: {
        operators: [
          //unary ops (like `is_empty`) will be excluded anyway, see getWidgetsForFieldOp()
          'equal',
          'not_equal',
          'proximity', //can exclude if you want
        ],
      },
    },
  },
  number: {
    defaultOperator: 'equal',
    mainWidget: 'number',
    widgets: {
      number: {
        operators: [
          'equal',
          'not_equal',
          'less',
          'less_or_equal',
          'greater',
          'greater_or_equal',
          'between',
          'not_between',
          'is_empty',
          'is_not_empty',
        ],
      },
      slider: {
        operators: [
          'equal',
          'not_equal',
          'less',
          'less_or_equal',
          'greater',
          'greater_or_equal',
          'is_empty',
          'is_not_empty',
        ],
      },
    },
  },
  date: {
    defaultOperator: 'equal',
    widgets: {
      date: {
        operators: [
          'equal',
          'not_equal',
          'less',
          'less_or_equal',
          'greater',
          'greater_or_equal',
          'between',
          'not_between',
          'is_empty',
          'is_not_empty',
        ],
      },
    },
  },
  time: {
    defaultOperator: 'equal',
    widgets: {
      time: {
        operators: [
          'equal',
          'not_equal',
          'less',
          'less_or_equal',
          'greater',
          'greater_or_equal',
          'between',
          'not_between',
          'is_empty',
          'is_not_empty',
        ],
      },
    },
  },
  datetime: {
    defaultOperator: 'equal',
    widgets: {
      datetime: {
        operators: [
          'equal',
          'not_equal',
          'less',
          'less_or_equal',
          'greater',
          'greater_or_equal',
          'between',
          'not_between',
          'is_empty',
          'is_not_empty',
        ],
      },
    },
  },
  select: {
    mainWidget: 'select',
    defaultOperator: 'select_equals',
    widgets: {
      select: {
        operators: ['select_equals', 'select_not_equals'],
        widgetProps: {
          customProps: {
            showSearch: true,
          },
        },
      },
      multiselect: {
        operators: ['select_any_in', 'select_not_any_in'],
      },
    },
  },
  multiselect: {
    defaultOperator: 'multiselect_equals',
    widgets: {
      multiselect: {
        operators: ['multiselect_equals', 'multiselect_not_equals'],
      },
    },
  },
  boolean: {
    defaultOperator: 'equal',
    widgets: {
      boolean: {
        operators: ['equal', 'not_equal'],
        widgetProps: {
          //you can enable this if you don't use fields as value sources
          // hideOperator: true,
          // operatorInlineLabel: "is",
        },
      },
      field: {
        operators: ['equal', 'not_equal'],
      },
    },
  },
};

//----------------------------  settings

const settings = {
  ...defaultSettings,

  formatField: (field, parts, label2, fieldDefinition, config, isForDisplay) => {
    if (isForDisplay) return label2;
    else return field;
  },
  sqlFormatReverse: (q, operator, reversedOp, operatorDefinition, revOperatorDefinition) => {
    if (q == undefined) return undefined;
    return 'NOT(' + q + ')';
  },
  formatReverse: (
    q,
    operator,
    reversedOp,
    operatorDefinition,
    revOperatorDefinition,
    isForDisplay
  ) => {
    if (q == undefined) return undefined;
    if (isForDisplay) return 'NOT(' + q + ')';
    else return '!(' + q + ')';
  },
  canCompareFieldWithField: (leftField, leftFieldConfig, rightField, rightFieldConfig) => {
    //for type == 'select'/'multiselect' you can check listValues
    return true;
  },

  // enable compare fields
  valueSourcesInfo: {
    value: {
      label: 'Value',
    },
    field: {
      label: 'Field',
      widget: 'field',
    },
    func: {
      label: 'Function',
      widget: 'func',
    },
  },
  customFieldSelectProps: {
    showSearch: true,
  },
};

//----------------------------

export default {
  conjunctions,
  operators,
  widgets,
  types,
  settings,
};
