/* eslint-disable no-unused-vars */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/require-default-props */
/* eslint-disable react/no-unused-prop-types */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import last from 'lodash/last';
import keys from 'lodash/keys';
import { getFieldConfig, getFieldPath, getFieldPathLabels } from '../utils/configUtils';
import { truncateString, useOnPropsChanged } from '../utils/stuff';

export default class Field extends PureComponent {
  static propTypes = {
    config: PropTypes.object.isRequired,
    selectedField: PropTypes.string,
    parentField: PropTypes.string,
    customProps: PropTypes.object,
    readonly: PropTypes.bool,
    // actions
    setField: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    useOnPropsChanged(this);

    this.onPropsChanged(props);
  }

  onPropsChanged(nextProps) {
    const prevProps = this.props;
    const keysForMeta = ['selectedField', 'config', 'parentField'];
    const needUpdateMeta =
      !this.meta ||
      keysForMeta.map((k) => nextProps[k] !== prevProps[k]).filter((ch) => ch).length > 0;

    if (needUpdateMeta) {
      this.meta = this.getMeta(nextProps);
    }
  }

  getMeta({ selectedField, config, parentField }) {
    const selectedKey = selectedField;
    const {
      maxLabelsLength,
      fieldSeparatorDisplay,
      fieldPlaceholder,
      fieldSeparator,
    } = config.settings;
    const isFieldSelected = !!selectedField;
    const placeholder = !isFieldSelected ? truncateString(fieldPlaceholder, maxLabelsLength) : null;
    const currField = isFieldSelected ? getFieldConfig(selectedKey, config) : null;
    const selectedOpts = currField || {};

    const selectedKeys = getFieldPath(selectedKey, config);
    const selectedPath = getFieldPath(selectedKey, config, true);
    const selectedLabel = this.getFieldLabel(currField, selectedKey, config);
    const partsLabels = getFieldPathLabels(selectedKey, config);
    let selectedFullLabel = partsLabels ? partsLabels.join(fieldSeparatorDisplay) : null;
    if (selectedFullLabel === selectedLabel || parentField) {
      selectedFullLabel = null;
    }
    const selectedAltLabel = selectedOpts.label2;

    const parentFieldPath =
      typeof parentField === 'string' ? parentField.split(fieldSeparator) : parentField;
    const parentFieldConfig = parentField ? getFieldConfig(parentField, config) : null;
    const sourceFields = parentField
      ? parentFieldConfig && parentFieldConfig.subfields
      : config.fields;
    const items = this.buildOptions(parentFieldPath, config, sourceFields, parentFieldPath);

    return {
      placeholder,
      items,
      parentField,
      selectedKey,
      selectedKeys,
      selectedPath,
      selectedLabel,
      selectedOpts,
      selectedAltLabel,
      selectedFullLabel,
    };
  }

  getFieldLabel(fieldOpts, fieldKey, config) {
    if (!fieldKey) return null;
    const { fieldSeparator } = config.settings;
    const { maxLabelsLength } = config.settings;
    const fieldParts = Array.isArray(fieldKey) ? fieldKey : fieldKey.split(fieldSeparator);
    let label = (fieldOpts && fieldOpts.label) || last(fieldParts);
    label = truncateString(label, maxLabelsLength);
    return label;
  }

  buildOptions(parentFieldPath, config, fields, path = null, optGroupLabel = null) {
    if (!fields) {
      return null;
    }
    const { fieldSeparator, fieldSeparatorDisplay } = config.settings;
    const prefix = path ? path.join(fieldSeparator) + fieldSeparator : '';

    return keys(fields)
      .map((fieldKey) => {
        const field = fields[fieldKey];
        const label = this.getFieldLabel(field, fieldKey, config);
        const partsLabels = getFieldPathLabels(prefix + fieldKey, config);
        let fullLabel = partsLabels.join(fieldSeparatorDisplay);
        if (fullLabel === label || parentFieldPath) {
          fullLabel = null;
        }
        const altLabel = field.label2;
        const { tooltip } = field;
        const subpath = (path || []).concat(fieldKey);
        const { disabled } = field;

        if (field.hideForSelect) {
          return undefined;
        }

        if (field.type === '!struct') {
          return {
            disabled,
            key: fieldKey,
            path: prefix + fieldKey,
            label,
            fullLabel,
            altLabel,
            tooltip,
            items: this.buildOptions(parentFieldPath, config, field.subfields, subpath, label),
          };
        } else {
          return {
            disabled,
            key: fieldKey,
            path: prefix + fieldKey,
            label,
            fullLabel,
            altLabel,
            tooltip,
            grouplabel: optGroupLabel,
          };
        }
      })
      .filter((o) => !!o);
  }

  render() {
    const { config, customProps, setField, readonly } = this.props;
    const { renderField } = config.settings;
    const renderProps = {
      config,
      customProps,
      readonly,
      setField,
      ...this.meta,
    };
    return renderField(renderProps);
  }
}
