import React, { Component } from 'react';
import PropTypes from 'prop-types';
import mapValues from 'lodash/mapValues';
import { connect } from 'react-redux';
import { pureShouldComponentUpdate } from '../../utils/renderUtils';
import { useOnPropsChanged } from '../../utils/stuff';

export default (Group) => {
  class GroupContainer extends Component {
    static propTypes = {
      // tree: PropTypes.instanceOf(Immutable.Map).isRequired,
      config: PropTypes.object.isRequired,
      actions: PropTypes.object.isRequired, // {setConjunction: Funciton, removeGroup, addGroup, addRule, ...}
      path: PropTypes.any.isRequired, // instanceOf(Immutable.List)
      id: PropTypes.string.isRequired,
      not: PropTypes.bool,
      conjunction: PropTypes.string,
      children1: PropTypes.any, // instanceOf(Immutable.OrderedMap)
      onDragStart: PropTypes.func,
      reordableNodesCnt: PropTypes.number,
      selectedField: PropTypes.string, // for RuleGroup
      parentField: PropTypes.string, // from RuleGroup
      // connected:
      dragging: PropTypes.object, // {id, x, y, w, h}
      isDraggingTempo: PropTypes.bool,
    };

    constructor(props) {
      super(props);
      useOnPropsChanged(this);

      this.conjunctionOptions = this._getConjunctionOptions(props);
      this.dummyFn.isDummyFn = true;
    }

    shouldComponentUpdate(nextProps, nextState) {
      const prevProps = this.props;
      const prevState = this.state;

      let should = pureShouldComponentUpdate(this)(nextProps, nextState);
      if (should) {
        if (prevState == nextState && prevProps != nextProps) {
          const draggingId = nextProps.dragging.id || prevProps.dragging.id;
          const isDraggingMe = draggingId == nextProps.id;
          const chs = [];
          for (const k in nextProps) {
            let changed = nextProps[k] != prevProps[k];
            if (k == 'dragging' && !isDraggingMe) {
              changed = false; // dragging another item -> ignore
            }
            if (changed) {
              chs.push(k);
            }
          }
          if (!chs.length) should = false;
        }
      }
      return should;
    }

    onPropsChanged(nextProps) {
      const { config, id, conjunction } = nextProps;
      const oldConfig = this.props.config;
      const oldConjunction = this.props.conjunction;
      if (oldConfig != config || oldConjunction != conjunction) {
        this.conjunctionOptions = this._getConjunctionOptions(nextProps);
      }
    }

    _getConjunctionOptions(props) {
      return mapValues(props.config.conjunctions, (item, index) => ({
        id: `conjunction-${props.id}-${index}`,
        name: `conjunction[${props.id}]`,
        key: index,
        label: item.label,
        checked: index === props.conjunction,
      }));
    }

    setConjunction = (conj = null) => {
      this.props.actions.setConjunction(this.props.path, conj);
    };

    setNot = (not = null) => {
      this.props.actions.setNot(this.props.path, not);
    };

    dummyFn = () => {};

    removeSelf = () => {
      this.props.actions.removeGroup(this.props.path);
    };

    addGroup = () => {
      this.props.actions.addGroup(this.props.path);
    };

    addRule = () => {
      this.props.actions.addRule(this.props.path);
    };

    // for RuleGroup
    setField = (field) => {
      this.props.actions.setField(this.props.path, field);
    };

    render() {
      const isDraggingMe = this.props.dragging.id == this.props.id;
      const currentNesting = this.props.path.size;
      const {maxNesting} = this.props.config.settings;
      const isInDraggingTempo = !isDraggingMe && this.props.isDraggingTempo;

      // Don't allow nesting further than the maximum configured depth and don't
      // allow removal of the root group.
      const allowFurtherNesting = typeof maxNesting === 'undefined' || currentNesting < maxNesting;
      const isRoot = currentNesting == 1;

      return (
        <div className="group-or-rule-container group-container" data-id={this.props.id}>
          {[
            isDraggingMe ? (
              <Group
                key="dragging"
                id={this.props.id}
                isDraggingMe
                isDraggingTempo
                dragging={this.props.dragging}
                isRoot={isRoot}
                allowFurtherNesting={allowFurtherNesting}
                conjunctionOptions={this.conjunctionOptions}
                not={this.props.not}
                selectedConjunction={this.props.conjunction}
                setConjunction={this.dummyFn}
                setNot={this.dummyFn}
                removeSelf={this.dummyFn}
                addGroup={this.dummyFn}
                addRule={this.dummyFn}
                setField={this.dummyFn}
                config={this.props.config}
                children1={this.props.children1}
                actions={this.props.actions}
                // tree={this.props.tree}
                reordableNodesCnt={this.props.reordableNodesCnt}
                totalRulesCnt={this.props.totalRulesCnt}
                selectedField={this.props.field || null}
                parentField={this.props.parentField || null}
              />
            ) : null,
            <Group
              key={this.props.id}
              id={this.props.id}
              isDraggingMe={isDraggingMe}
              isDraggingTempo={isInDraggingTempo}
              onDragStart={this.props.onDragStart}
              isRoot={isRoot}
              allowFurtherNesting={allowFurtherNesting}
              conjunctionOptions={this.conjunctionOptions}
              not={this.props.not}
              selectedConjunction={this.props.conjunction}
              setConjunction={isInDraggingTempo ? this.dummyFn : this.setConjunction}
              setNot={isInDraggingTempo ? this.dummyFn : this.setNot}
              removeSelf={isInDraggingTempo ? this.dummyFn : this.removeSelf}
              addGroup={isInDraggingTempo ? this.dummyFn : this.addGroup}
              addRule={isInDraggingTempo ? this.dummyFn : this.addRule}
              setField={isInDraggingTempo ? this.dummyFn : this.setField}
              config={this.props.config}
              children1={this.props.children1}
              actions={this.props.actions}
              // tree={this.props.tree}
              reordableNodesCnt={this.props.reordableNodesCnt}
              totalRulesCnt={this.props.totalRulesCnt}
              selectedField={this.props.field || null}
              parentField={this.props.parentField || null}
            />,
          ]}
        </div>
      );
    }
  }

  const ConnectedGroupContainer = connect((state) => {
    return {
      dragging: state.dragging,
    };
  })(GroupContainer);
  ConnectedGroupContainer.displayName = 'ConnectedGroupContainer';

  return ConnectedGroupContainer;
};
