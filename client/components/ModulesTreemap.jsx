import React from 'react';
import filesize from 'filesize';
import {computed} from 'mobx';
import {observer} from 'mobx-preact';

import {isChunkParsed} from '../utils';
import Treemap from './Treemap';
import Tooltip from './Tooltip';
import Switcher from './Switcher';
import Sidebar from './Sidebar';
import Checkbox from './Checkbox';
import CheckboxList from './CheckboxList';
import ContextMenu from './ContextMenu';

import s from './ModulesTreemap.css';
import sidebarStyles from './Sidebar.css';
import Search from './Search';
import {store} from '../store';
import ModulesList from './ModulesList';
import ModuleInfo from './ModuleInfo';

const SIZE_SWITCH_ITEMS = [
  {label: 'Stat', prop: 'statSize'},
  {label: 'Parsed', prop: 'parsedSize'},
  {label: 'Gzipped', prop: 'gzipSize'}
];

@observer
export default class ModulesTreemap extends React.Component {
  mouseCoords = {
    x: 0,
    y: 0
  };

  treemap = null;
  treemapContainer = null;

  state = {
    selectedChunk: null,
    selectedMouseCoords: {x: 0, y: 0},
    showChunkContextMenu: false,
    showTooltip: false,
    tooltipContent: null
  };

  componentDidMount() {
    document.addEventListener('mousemove', this.handleMouseMove, true);
  }

  componentWillUnmount() {
    document.removeEventListener('mousemove', this.handleMouseMove, true);
  }

  render() {
    const {
      selectedChunk,
      selectedMouseCoords,
      showChunkContextMenu,
      showTooltip,
      tooltipContent
    } = this.state;

    return (
      <div className={s.container}>
        <Sidebar>
          <div className={sidebarStyles.group}>
            <Switcher label="Treemap sizes"
              items={this.sizeSwitchItems}
              activeItem={this.activeSizeItem}
              onSwitch={this.handleSizeSwitch}/>
            {store.hasConcatenatedModules &&
              <div className={s.showOption}>
                <Checkbox checked={store.showConcatenatedModulesContent}
                  onChange={this.handleConcatenatedModulesContentToggle}>
                  {`Show content of concatenated modules${store.activeSize === 'statSize' ? '' : ' (inaccurate)'}`}
                </Checkbox>
              </div>
            }
          </div>
          <div className={sidebarStyles.group}>
            <Search label="Search modules"
              query={store.searchQuery}
              autofocus
              onQueryChange={this.handleQueryChange}/>
            <div className={s.foundModulesInfo}>
              {this.foundModulesInfo}
            </div>
            {store.isSearching && store.hasFoundModules &&
              <div className={s.foundModulesContainer}>
                {store.foundModulesByChunk.map(({chunk, modules}) =>
                  <div key={chunk.cid} className={s.foundModulesChunk}>
                    <div className={s.foundModulesChunkName}
                      onClick={() => this.treemap.zoomToGroup(chunk)}>
                      {chunk.label}
                    </div>
                    <ModulesList className={s.foundModulesList}
                      modules={modules}
                      showSize={store.activeSize}
                      highlightedText={store.searchQueryRegexp}
                      isModuleVisible={this.isModuleVisible}
                      onModuleClick={this.handleFoundModuleClick}/>
                  </div>
                )}
              </div>
            }
          </div>
          {this.chunkItems.length > 1 &&
            <div className={sidebarStyles.group}>
              <CheckboxList label="Show chunks"
                items={this.chunkItems}
                checkedItems={store.selectedChunks}
                renderLabel={this.renderChunkItemLabel}
                onChange={this.handleSelectedChunksChange}/>
            </div>
          }
        </Sidebar>
        <div ref={this.saveTreemapContainerRef} className={s.map}>
          <Treemap ref={this.saveTreemapRef}
            data={store.visibleChunks}
            highlightGroups={this.highlightedModules}
            weightProp={store.activeSize}
            onMouseLeave={this.handleMouseLeaveTreemap}
            onGroupHover={this.handleTreemapGroupHover}
            onGroupSelect={this.handleTreemapGroupSelect}
            onGroupSecondaryClick={this.handleTreemapGroupSecondaryClick}
            onResize={this.handleResize}/>
        </div>
        <Sidebar ref={this.saveRightSidebarRef}
          position="right"
          autoShow={false}>
          {store.selectedModule ?
            <ModuleInfo module={store.selectedModule}/>
            :
            <div className={s.noSelectedModule}>
              Select a module to see more information about it.
            </div>
          }
        </Sidebar>
        <Tooltip visible={showTooltip} container={this.treemapContainer}>
          {tooltipContent}
        </Tooltip>
        <ContextMenu visible={showChunkContextMenu}
          chunk={selectedChunk}
          coords={selectedMouseCoords}
          onHide={this.handleChunkContextMenuHide}/>
      </div>
    );
  }

  renderModuleSize(module, sizeType) {
    const sizeProp = `${sizeType}Size`;
    const size = module[sizeProp];
    const sizeLabel = SIZE_SWITCH_ITEMS.find(item => item.prop === sizeProp).label;
    const isActive = (store.activeSize === sizeProp);

    return (typeof size === 'number') ?
      <div className={isActive ? s.activeSize : ''}>
        {sizeLabel} size:&nbsp;<strong>{filesize(size)}</strong>
      </div>
      :
      null;
  }

  renderChunkItemLabel = item => {
    const isAllItem = (item === CheckboxList.ALL_ITEM);
    const label = isAllItem ? 'All' : item.label;
    const size = isAllItem ? store.totalChunksSize : item[store.activeSize];

    return [
      `${label} (`,
      <strong>{filesize(size)}</strong>,
      ')'
    ];
  };

  @computed get sizeSwitchItems() {
    return store.hasParsedSizes ? SIZE_SWITCH_ITEMS : SIZE_SWITCH_ITEMS.slice(0, 1);
  }

  @computed get activeSizeItem() {
    return this.sizeSwitchItems.find(item => item.prop === store.activeSize);
  }

  @computed get chunkItems() {
    const {allChunks, activeSize} = store;
    let chunkItems = [...allChunks];

    if (activeSize !== 'statSize') {
      chunkItems = chunkItems.filter(isChunkParsed);
    }

    chunkItems.sort((chunk1, chunk2) => chunk2[activeSize] - chunk1[activeSize]);

    return chunkItems;
  }

  @computed get highlightedModules() {
    return new Set(store.foundModules);
  }

  @computed get foundModulesInfo() {
    if (!store.isSearching) {
      // `&nbsp;` to reserve space
      return '\u00A0';
    }

    if (store.hasFoundModules) {
      return ([
        <div className={s.foundModulesInfoItem}>
          Count: <strong>{store.foundModules.length}</strong>
        </div>,
        <div className={s.foundModulesInfoItem}>
          Total size: <strong>{filesize(store.foundModulesSize)}</strong>
        </div>
      ]);
    } else {
      return 'Nothing found' + (store.allChunksSelected ? '' : ' in selected chunks');
    }
  }

  handleConcatenatedModulesContentToggle = flag => {
    store.showConcatenatedModulesContent = flag;
  }

  handleChunkContextMenuHide = () => {
    this.setState({
      showChunkContextMenu: false
    });
  }

  handleResize = () => {
    // Close any open context menu when the report is resized,
    // so it doesn't show in an incorrect position
    if (this.state.showChunkContextMenu) {
      this.setState({
        showChunkContextMenu: false
      });
    }
  }

  handleSizeSwitch = sizeSwitchItem => {
    store.selectedSize = sizeSwitchItem.prop;
  };

  handleQueryChange = query => {
    store.searchQuery = query;
  }

  handleSelectedChunksChange = selectedChunks => {
    store.selectedChunks = selectedChunks;
  };

  handleMouseLeaveTreemap = () => {
    this.setState({showTooltip: false});
  };

  handleTreemapGroupSecondaryClick = event => {
    const {group} = event;

    if (group && group.isAsset) {
      this.setState({
        selectedChunk: group,
        selectedMouseCoords: {...this.mouseCoords},
        showChunkContextMenu: true
      });
    } else {
      this.setState({
        selectedChunk: null,
        showChunkContextMenu: false
      });
    }
  };

  handleTreemapGroupHover = event => {
    const {group} = event;

    if (group) {
      this.setState({
        showTooltip: true,
        tooltipContent: this.getTooltipContent(group)
      });
    } else {
      this.setState({showTooltip: false});
    }
  };

  handleTreemapGroupSelect = module => {
    store.selectedModule = module;
    this.rightSidebar.toggleVisibility(true);
  }

  handleFoundModuleClick = module => this.treemap.zoomToGroup(module);

  handleMouseMove = event => {
    Object.assign(this.mouseCoords, {
      x: event.pageX,
      y: event.pageY
    });
  }

  isModuleVisible = module => (
    this.treemap.isGroupRendered(module)
  )

  saveTreemapContainerRef = node => this.treemapContainer = node;
  saveTreemapRef = treemap => this.treemap = treemap;
  saveRightSidebarRef = sidebar => this.rightSidebar = sidebar;

  getTooltipContent(module) {
    if (!module) return null;

    return (
      <div>
        <div><strong>{module.label}</strong></div>
        <br/>
        {this.renderModuleSize(module, 'stat')}
        {!module.inaccurateSizes && this.renderModuleSize(module, 'parsed')}
        {!module.inaccurateSizes && this.renderModuleSize(module, 'gzip')}
        {module.path &&
          <div>Path:&nbsp;<strong>{module.path}</strong></div>
        }
        {module.isAsset &&
          <div>
            <br/>
            <strong><em>Right-click to view options related to this chunk</em></strong>
          </div>
        }
      </div>
    );
  }

}
