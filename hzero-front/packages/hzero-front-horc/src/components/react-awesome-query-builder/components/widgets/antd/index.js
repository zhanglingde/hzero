import React from 'react';
import { LocaleProvider } from 'hzero-ui';

// value widgets
import DateWidget from './value/Date';
import DateTimeWidget from './value/DateTime';
import TimeWidget from './value/Time';
import SelectWidget from './value/Select';
import TextWidget from './value/Text';
import NumberWidget from './value/Number';
import SliderWidget from './value/Slider';
import RangeWidget from './value/Range';
import BooleanWidget from './value/Boolean';
import MultiSelectWidget from './value/MultiSelect';
import TreeSelectWidget from './value/TreeSelect';

// field select widgets
import FieldSelect from './core/FieldSelect';
import FieldDropdown from './core/FieldDropdown';
import FieldCascader from './core/FieldCascader';
import FieldTreeSelect from './core/FieldTreeSelect';

// core components
import Button from './core/Button';
import ButtonGroup from './core/ButtonGroup';
import Conjs from './core/Conjs';
import ValueSources from './core/ValueSources';
import confirm from './core/confirm';

const Provider = ({ config, children }) => (
  <LocaleProvider locale={config.settings.locale.antd}>{children}</LocaleProvider>
);

export default {
  DateWidget,
  DateTimeWidget,
  TimeWidget,
  SelectWidget,
  TextWidget,
  NumberWidget,
  SliderWidget,
  RangeWidget,
  BooleanWidget,
  MultiSelectWidget,
  TreeSelectWidget,

  FieldSelect,
  FieldDropdown,
  FieldCascader,
  FieldTreeSelect,

  Button,
  ButtonGroup,
  Conjs,
  ValueSources,
  confirm,

  Provider,
};
