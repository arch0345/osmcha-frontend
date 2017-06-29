// @flow
import React from 'react';
import { connect } from 'react-redux';
import { List as ImmutableList, Map, fromJS } from 'immutable';
import { NavLink } from 'react-router-dom';
import { push } from 'react-router-redux';
import numberWithCommas from '../utils/number_with_commas.js';

import type { RootStateType } from '../store';

import {
  getChangesetsPage,
  applyFilters
} from '../store/changesets_page_actions';

import { List } from '../components/list';
import { Button } from '../components/button';
import { PageRange } from '../components/list/page_range';
import { Dropdown } from '../components/dropdown';
import { keyboardToggleEnhancer } from '../components/keyboard_enhancer';

import {
  NEXT_CHANGESET,
  PREV_CHANGESET,
  FILTER_BINDING
} from '../config/bindings';

import { PAGE_SIZE } from '../config/constants';

import filters from '../config/filters.json';

const RANGE = 6;

function range(start, end) {
  return Array.from(new Array(end - start)).map((k, i) => i + start);
}
class ChangesetsList extends React.PureComponent {
  props: {
    location: Object,
    loading: boolean,
    error: Object,
    currentPage: ?Map<string, *>,
    diff: number,
    diffLoading: boolean,
    pageIndex: number,
    activeChangesetId: ?number,
    filters: Map<string, ImmutableList<*>>,
    bindingsState: Map<string, *>,
    getChangesetsPage: (number, ?boolean) => mixed, // base 0
    push: Object => mixed,
    applyFilters: (Map<string, ImmutableList<*>>) => mixed // base 0
  };
  maxPageCount = Infinity;
  constructor(props) {
    super(props);
    this.props.getChangesetsPage(props.pageIndex);
  }

  goUpDownToChangeset = (direction: number) => {
    if (!this.props.currentPage) return;
    let features = this.props.currentPage.get('features');
    if (features) {
      let index = features.findIndex(
        f => f.get('id') === this.props.activeChangesetId
      );
      index += direction;
      const nextFeature = features.get(index);
      if (nextFeature) {
        const location = {
          ...this.props.location, //  clone it
          pathname: `/changesets/${nextFeature.get('id')}`
        };
        this.props.push(location);
      }
    }
  };

  componentWillReceiveProps(nextProps) {
    const bindingsState = this.props.bindingsState;
    const nextBindingsState = nextProps.bindingsState;
    if (
      bindingsState.get(FILTER_BINDING.label) !==
      nextBindingsState.get(FILTER_BINDING.label)
    ) {
      if (this.props.location && this.props.location.pathname === '/filters') {
        const location = {
          ...this.props.location, //  clone it
          pathname: '/'
        };
        this.props.push(location);
      } else {
        const location = {
          ...this.props.location, //  clone it
          pathname: '/filters'
        };
        this.props.push(location);
      }
    }
    if (
      bindingsState.get(NEXT_CHANGESET.label) !==
      nextBindingsState.get(NEXT_CHANGESET.label)
    ) {
      this.goUpDownToChangeset(1);
    }
    if (
      bindingsState.get(PREV_CHANGESET.label) !==
      nextBindingsState.get(PREV_CHANGESET.label)
    ) {
      this.goUpDownToChangeset(-1);
    }
  }

  handleFilterOrderBy = (selected: Array<*>) => {
    let mergedFilters;
    mergedFilters = this.props.filters.set('order_by', fromJS(selected));

    this.props.applyFilters(mergedFilters);
  };

  reloadCurrentPage = () => {
    this.props.getChangesetsPage(this.props.pageIndex, true);
  };
  render() {
    const base = parseInt(this.props.pageIndex / RANGE, 10) * RANGE;

    const { currentPage, loading, diff, diffLoading } = this.props;
    if (
      this.props.pageIndex === 0 &&
      currentPage &&
      !Number.isNaN(currentPage.get('count', 10))
    ) {
      const count: number = currentPage.get('count', 10);
      this.maxPageCount = Math.ceil(count / PAGE_SIZE);
    }

    const valueData = [];
    const options = filters.filter(f => f.name === 'order_by')[0].options;
    if (this.props.filters.get('order_by')) {
      options.forEach(o => {
        if (this.props.filters.getIn(['order_by', 0, 'value']) === o.value) {
          valueData.push(o);
        }
      });
    }
    return (
      <div
        className={`flex-parent flex-parent--column changesets-list bg-white ${window.innerWidth <
          800
          ? 'viewport-full'
          : ''}`}
      >
        <header className="px12 hmin36 border-b border--gray-light bg-gray-faint txt-s flex-parent justify--space-between align-items--center">
          <Dropdown
            onAdd={() => {}}
            onRemove={() => {}}
            onChange={this.handleFilterOrderBy}
            value={valueData}
            options={filters.filter(f => f.name === 'order_by')[0].options}
            display={(valueData[0] && valueData[0].label) || 'Order by'}
          />
          <NavLink
            activeStyle={{
              fontWeight: 'bold'
            }}
            to={{
              search: this.props.location.search,
              pathname: this.props.location.pathname.indexOf('/filters') > -1
                ? '/'
                : '/filters'
            }}
          >
            <Button className="mx3">Filters</Button>
          </NavLink>
        </header>
        <header
          className={`px12 border-l border-b border-b--1 border--gray-light px12 py6 ${diff >
            0
            ? 'bg-darken10'
            : 'bg-gray-faint'} flex-child align-items--center`}
        >
          <span className="flex-parent flex-parent--row justify--space-between color-gray txt-s txt-bold">
            <span>
              {(this.props.currentPage &&
                numberWithCommas(this.props.currentPage.get('count'))) ||
                0}{' '}
              changesets.
            </span>
            <span className="flex-parent flex-parent--row">
              {diffLoading
                ? <span className="loading loading--s inline" />
                : <Button
                    className="mx3 btn--xs"
                    iconName="rotate"
                    onClick={this.reloadCurrentPage}
                  >
                    {diff > 0 ? `${diff} new` : ''}
                  </Button>}
            </span>
          </span>
        </header>
        <List
          activeChangesetId={this.props.activeChangesetId}
          currentPage={currentPage}
          loading={loading}
          pageIndex={this.props.pageIndex}
        />
        <footer className="hmin55 p12 border-t border--gray-light bg-gray-faint txt-s flex-parent justify--space-around">
          <PageRange
            page={'arrow-left'}
            pageIndex={this.props.pageIndex - 1}
            disabled={this.props.pageIndex - 1 === -1}
            active={false}
            getChangesetsPage={this.props.getChangesetsPage}
          />
          {range(base, Math.min(base + RANGE, this.maxPageCount)).map(n =>
            <PageRange
              key={n}
              page={n}
              pageIndex={n}
              active={n === this.props.pageIndex}
              getChangesetsPage={this.props.getChangesetsPage}
            />
          )}
          <PageRange
            page={'arrow-right'}
            disabled={this.props.pageIndex + 1 >= this.maxPageCount}
            pageIndex={this.props.pageIndex + 1}
            active={false}
            getChangesetsPage={this.props.getChangesetsPage}
          />
        </footer>
      </div>
    );
  }
}

ChangesetsList = keyboardToggleEnhancer(
  false,
  [NEXT_CHANGESET, PREV_CHANGESET, FILTER_BINDING],
  ChangesetsList
);

ChangesetsList = connect(
  (state: RootStateType, props) => ({
    location: state.routing.location,
    loading: state.changesetsPage.get('loading'),
    error: state.changesetsPage.get('error'),
    currentPage: state.changesetsPage.get('currentPage'),
    diff: state.changesetsPage.get('diff'),
    diffLoading: state.changesetsPage.get('diffLoading'),
    pageIndex: state.changesetsPage.get('pageIndex') || 0,
    activeChangesetId: state.changeset.get('changesetId'),
    filters: state.changesetsPage.get('filters') || Map()
  }),
  {
    // actions
    getChangesetsPage,
    applyFilters,
    push
  }
)(ChangesetsList);
export { ChangesetsList };
