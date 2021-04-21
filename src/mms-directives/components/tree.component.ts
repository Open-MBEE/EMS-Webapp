import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

let TreeComponent = {
    selector: "tree",
    template: `
<ul class="nav nav-list nav-pills nav-stacked abn-tree">
    <li ng-repeat="row in $ctrl.treeRows | filter:{visible:true} track by row.branch.uid" ng-hide="!$ctrl.treeFilter(row, $ctrl.options.search)"
        ng-class="'level-' + {{row.level}}" class="abn-tree-row">
        <div class="arrow" ng-click="user_clicks_branch(row.branch)" ng-dblclick="user_dblclicks_branch(row.branch)" ng-class="{'active-text': row.branch.selected}" id="tree-branch-{{row.branch.data.id}}">
            <div class="shaft" ng-class="{'shaft-selected': row.branch.selected, 'shaft-hidden': !row.branch.selected}">
                <a ng-href="{{getHref(row);}}" class="tree-item">
                    <i ng-class="{'active-text': row.branch.selected}" ng-click="expandCallback(row, $event)" class="indented tree-icon {{row.expand_icon}}" ></i>
                    <i ng-class="{'active-text': row.branch.selected}" class="indented tree-icon {{row.type_icon}}" ></i>
                    <span class="indented tree-label" ng-class="{'active-text': row.branch.selected}">{{row.section}} {{row.branch.data.name}}</span>
                </a>
            </div>
        </div>
    </li>
</ul>
`,
    bindings: {
        treeData: '<',
        treeControl: '<',
        initialSelection: '@',
        options: '<'
    },
    controller: class TreeController {
        static $inject = ['ApplicationService', '$timeout', '$log', '$filter', '$scope', '$attrs', 'UtilsService']

        private ApplicationService;
        private $timeout;
        private $log;
        private $filter;
        private $attrs;
        private UtilsService;

        //bindings
        public treeData;
        private treeControl;
        private initialSelection;
        public options;

        //public data
        public treeRows;
        public treeFilter;

        //local Variables
        private expand_level
        public selected_branch

        //DEBUG VARIABLES
        private changes

        constructor(ApplicationService, $timeout, $log, $filter, $attrs, UtilsService) {
            this.ApplicationService = ApplicationService;
            this.$timeout = $timeout;
            this.$log = $log;
            this.$filter = $filter;
            this.$attrs = $attrs;
            this.UtilsService = UtilsService;
        }

        $onInit = () => {

            if (!this.options) {
                this.options = {
                    expandLevel: 1,
                    search: ''
                };
            }

            if (!this.$attrs.iconExpand)
                this.$attrs.iconExpand = 'fa fa-caret-right fa-lg fa-fw';
            if (!this.$attrs.iconCollapse)
                this.$attrs.iconCollapse = 'fa fa-caret-down fa-lg fa-fw';
            if (!this.$attrs.iconDefault)
                this.$attrs.iconDefault = 'fa fa-file fa-fw';
            if (!this.options.expandLevel && this.options.expandLevel !== 0)
                this.options.expandLevel = 1;

            this.expand_level = this.options.expandLevel;
            this.selected_branch = this.treeControl.selected_branch;

            

            this.treeControl.attrs = this.$attrs;
            this.treeFilter = this.$filter('uiTreeFilter');
            
            if (!angular.isArray(this.treeData)) {
                this.$log.warn('treeData is not an array!');
                //return;
            }

            if (this.initialSelection) {
                this.treeControl.for_each_branch((b) => {
                    if (b.data.id === this.initialSelection) {
                        this.$timeout(() => {
                            this.treeControl.select_branch(b);
                        });
                    }
                },this.treeData);
            }

            this.treeControl.for_each_branch((b, level) => {
                b.level = level;
                b.expanded = b.level <= this.expand_level;
            },this.treeData);

            
        }

        $onChanges = (changes) => {
            if (changes.treeData) {
                this.treeRows = [];
                this.treeData = angular.copy(changes.treeData.currentValue);
                console.log(this.treeData.length);
                console.log(this.treeData);
                this.treeControl.on_treeData_change(this.treeData, this.options);
                this.treeRows = angular.copy(this.treeControl.treeRows);
            }
            if (changes.initialSelection) {
                this.treeRows = [];
                this.initialSelection = angular.copy(changes.initialSelection.currentValue);
                this.treeControl.on_initialSelection_change(this.initialSelection, this.treeData, this.options);
                this.treeRows = angular.copy(this.treeControl.treeRows);
            }
        }

        user_clicks_branch = (branch, treeData, options) =>  {
            this.treeControl.user_clicks_branch(branch, treeData, options);
          };

        user_dblclicks_branch = (branch) => {
            if (branch.onDblclick) {
                this.$timeout(() => {
                    branch.onDblclick(branch);
                });
            } else if (this.options.onDblclick) {
                this.$timeout(() => {
                    this.options.onDblclick(branch);
                });
            }
        };

        getHref = (row) => {
            var data = row.branch.data;
            if (row.branch.type !== 'group' && this.UtilsService.isDocument(data) && !this.ApplicationService.getState().fullDoc) {
                var ref = data._refId ? data._refId : 'master';
                return this.UtilsService.PROJECT_URL_PREFIX + data._projectId + '/' + ref+ '/documents/' + data.id + '/views/' + data.id;
            }
        }

    }
}

mmsDirectives.component(TreeComponent.selector, TreeComponent);