/* eslint-disable no-param-reassign */
/* eslint-disable react/require-default-props */
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { InputNumber, Col } from 'hzero-ui';

export default class NumberWidget extends PureComponent {
  static propTypes = {
    setValue: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    config: PropTypes.object.isRequired,
    field: PropTypes.string.isRequired,
    value: PropTypes.number,
    customProps: PropTypes.object,
    fieldDefinition: PropTypes.object,
    readonly: PropTypes.bool,
    // from fieldSettings:
    min: PropTypes.number,
    max: PropTypes.number,
    step: PropTypes.number,
  };

  handleChange = (val) => {
    if (val === '' || val === null) val = undefined;
    this.props.setValue(val);
  };

  static defaultProps = {
    min: undefined,
    max: undefined,
    step: undefined,
  };

  render() {
    const { config, placeholder, customProps, value, min, max, step, readonly } = this.props;
    const { renderSize } = config.settings;
    const _value = value !== undefined ? value : undefined;

    return (
      <Col>
        <InputNumber
          disabled={readonly}
          key="widget-number"
          size={renderSize}
          value={_value}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          onChange={this.handleChange}
          {...customProps}
        />
      </Col>
    );
  }
}
