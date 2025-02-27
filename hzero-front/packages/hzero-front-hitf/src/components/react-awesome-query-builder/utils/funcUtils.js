import Immutable from 'immutable';
import { getFieldConfig, getFuncConfig } from '../utils/configUtils';

/**
 * @param {*} value
 * @param {string} valueSrc - 'value' | 'field' | 'func'
 * @param {object} config
 * @return {* | undefined} - undefined if func value is not complete (missing required arg vals); can return completed value != value
 */
export const completeValue = (value, valueSrc, config) => {
  if (valueSrc == 'func') return completeFuncValue(value, config);
  else return value;
};

/**
 * @param {Immutable.Map} value
 * @param {object} config
 * @return {Immutable.Map | undefined} - undefined if func value is not complete (missing required arg vals); can return completed value != value
 */
export const completeFuncValue = (value, config) => {
  const _checkFuncValue = (value) => {
    if (!value) return undefined;
    const funcKey = value.get('func');
    const funcConfig = funcKey && getFuncConfig(funcKey, config);
    if (!funcConfig) return undefined;
    let complValue = value;
    let tmpHasOptional = false;
    for (const argKey in funcConfig.args) {
      const argConfig = funcConfig.args[argKey];
      const args = complValue.get('args');
      const argVal = args ? args.get(argKey) : undefined;
      const argValue = argVal ? argVal.get('value') : undefined;
      const argValueSrc = argVal ? argVal.get('valueSrc') : undefined;
      if (argValue !== undefined) {
        const completeArgValue = completeValue(argValue, argValueSrc, config);
        if (completeArgValue === undefined) {
          return undefined;
        } else if (completeArgValue !== argValue) {
          complValue = complValue.setIn(['args', argKey, 'value'], completeArgValue);
        }
        if (tmpHasOptional) {
          // has gap
          return undefined;
        }
      } else if (argConfig.defaultValue !== undefined) {
        complValue = complValue.setIn(['args', argKey, 'value'], argConfig.defaultValue);
        complValue = complValue.setIn(['args', argKey, 'valueSrc'], 'value');
      } else if (argConfig.isOptional) {
        // optional
        tmpHasOptional = true;
      } else {
        // missing value
        return undefined;
      }
    }
    return complValue;
  };

  return _checkFuncValue(value);
};

/**
 * @param {Immutable.Map} value
 * @return {array} - [usedFields, badFields]
 */
const getUsedFieldsInFuncValue = (value, config) => {
  const usedFields = [];
  const badFields = [];

  const _traverse = (value) => {
    const args = value && value.get('args');
    if (!args) return;
    for (const arg of args.values()) {
      if (arg.get('valueSrc') == 'field') {
        const rightField = arg.get('value');
        if (rightField) {
          const rightFieldDefinition = config ? getFieldConfig(rightField, config) : undefined;
          if (config && !rightFieldDefinition) badFields.push(rightField);
          else usedFields.push(rightField);
        }
      } else if (arg.get('valueSrc') == 'func') {
        _traverse(arg.get('value'));
      }
    }
  };

  _traverse(value);

  return [usedFields, badFields];
};

/**
 * Used @ FuncWidget
 * @param {Immutable.Map} value
 * @param {string} funcKey
 * @param {object} config
 */
export const setFunc = (value, funcKey, config) => {
  const {fieldSeparator} = config.settings;
  value = value || new Immutable.Map();
  if (Array.isArray(funcKey)) {
    // fix for cascader
    funcKey = funcKey.join(fieldSeparator);
  }
  value = value.set('func', funcKey);
  value = value.set('args', new Immutable.Map());

  // defaults
  const funcConfig = funcKey && getFuncConfig(funcKey, config);
  if (funcConfig) {
    for (const argKey in funcConfig.args) {
      const argConfig = funcConfig.args[argKey];
      if (argConfig.defaultValue !== undefined) {
        value = value.setIn(['args', argKey, 'value'], argConfig.defaultValue);
      }
    }
  }

  return value;
};

/**
 * Used @ FuncWidget
 * @param {Immutable.Map} value
 * @param {string} argKey
 * @param {*} argVal
 */
export const setArgValue = (value, argKey, argVal) => {
  if (value && value.get('func')) {
    value = value.setIn(['args', argKey, 'value'], argVal);
  }
  return value;
};

/**
 * Used @ FuncWidget
 * @param {Immutable.Map} value
 * @param {string} argKey
 * @param {string} argValSrc
 */
export const setArgValueSrc = (value, argKey, argValSrc) => {
  if (value && value.get('func')) {
    value = value.setIn(['args', argKey], new Immutable.Map({ valueSrc: argValSrc }));
  }
  return value;
};
