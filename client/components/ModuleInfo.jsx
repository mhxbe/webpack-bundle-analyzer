import React from 'react';

import {store} from '../store';
import s from './ModuleInfo.css';
import sidebarStyles from './Sidebar.css';
import ModuleItem from './ModuleItem';

export default class ModuleInfo extends React.PureComponent {
  render({module}) {
    return (
      <div>
        <div className={sidebarStyles.group}>
          {module.label}
        </div>
        <div className={sidebarStyles.group}>
          <div className={sidebarStyles.groupLabel}>
            Reasons:
          </div>
          {this.reasonModules.map(reasonModule =>
            <ModuleItem key={reasonModule.id}
              module={reasonModule}
              showSize={store.activeSize}
              onClick={this.handleReasonModuleClick}/>
          )}
        </div>
      </div>
    );
  }

  get reasonModules() {
    return this.props.module.reasons.map(id => store.modulesById.get(id));
  }

  handleReasonModuleClick = module => {
    store.selectedModule = module;
  }
}
