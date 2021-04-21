import * as angular from 'angular';

var mmsApp = angular.module('mmsApp');


/* Controllers */
let TreePaneComponent = {
  selector: "treePane",
  template: `
  <div fa-pane pane-anchor="north" pane-size="78px" pane-no-toggle="true" pane-no-scroll="true">
    <div class="pane-left">
        <div class="pane-left-toolbar" role="toolbar">
            <button-bar-component buttons="$ctrl.buttons" button-control="$ctrl.bbApi"></button-bar-component>
        </div>
        <div class="tree-options">
            <button-bar-component buttons="$ctrl.treeButtons" button-control="$ctrl.tbApi"></button-bar-component>
            <input class="ve-plain-input" ng-model-options="{debounce: 1000}"
                ng-model="$ctrl.treeOptions.search" type="text" placeholder="{{$ctrl.filterInputPlaceholder}}"
                ng-change="$ctrl.searchInputChangeHandler();" style="flex:2">
        </div>
    </div>
</div>
<div fa-pane pane-anchor="center" pane-no-toggle="true">
    <div class="pane-left" style="display:table;">
        <tree ng-show="'showTree'==(activeMenu)" tree-data="$ctrl.treeData" tree-control="$ctrl.treeControl"
                initial-selection="{{$ctrl.initialSelection}}" options="$ctrl.treeOptions"></tree>

        <div data-ng-repeat="view in ::treeViewModes" ng-show="view.id==(activeMenu)">
            <h4 style="margin: 3px 0px 3px 10px;">List of {{view.title}}</h4>
            <ul class="nav nav-list nav-pills nav-stacked abn-tree">
                <li ng-repeat="row in view.branchList | filter:$ctrl.treeOptions.search track by $index"
                    class="abn-tree-row">
                    <div class="arrow" ng-click="user_clicks_branch(row)"
                        ng-class="{'active-text': row.branch.selected}" id="tree-branch-{{view.id}}-{{row.data.id}}">
                        <a class="tree-item" style="padding-left: 20px; position:relative;">
                            <i ng-class="{'active-text': row.branch.selected}"
                            class="indented tree-icon fa {{view.icon}}"></i>
                            <!-- TODO active branch -->
                            <span class="indented tree-label" ng-class="{'active-text': row.branch.selected}">{{row.data._veNumber}} {{row.data.name}}</span>
                        </a>
                    </div>
                </li>
            </ul>
        </div>

    </div>
</div>
`,
  bindings: {
    documentOb: "<",
    orgOb: "<",
    projectOb: "<",
    refOb: "<",
    refObs: "<",
    groupObs: "<",
    docMeta: "<"
  },
  controller: class TreePaneController {
    static $inject = ['$anchorScroll' , '$q', '$filter', '$location', '$uibModal', '$scope', '$rootScope', '$state','$timeout', 'growl',
      'UxService', 'ElementService', 'UtilsService', 'ViewService', 'ProjectService', 'MmsAppUtils', 'ToolbarService', 'ButtonBarService', 
      'TreeService'];

    //Injected Dependencies
    private $anchorScroll
    private $q
    private $filter
    private $location
    private $uibModal
    private $scope
    private $rootScope
    private $state
    private $timeout
    private growl
    private UxService
    private ElementService
    private UtilsService
    private ViewService
    private ProjectService
    private MmsAppUtils

    //Scope Services
    public $pane
    public bbApi
    public tbApi
    public buttons
    public treeButtons
    public treeControl
    public treeOptions
    public treeData
    public filterInputPlaceholder
    public tableList
    public figureList
    public equationList
    public treeViewModes
    public activeMenu
    public viewId2node
    public seenViewIds
    public itemType
    public newViewAggr
    public parentBranchData
    public oking
    public searchOptions
    public removeObject
    public initialSelection

    //Bindings
    private documentOb
    private viewOb
    private orgOb
    private projectOb
    private refOb
    private refObs
    private groupObs
    private docMeta

    //Local Variables
    private docEditable;
    private newView: any;
    private newGroup: { name: string };
    private newDoc: any;
    private createForm: boolean;
    private resolvedBindings;

    constructor($anchorScroll, $q, $filter, $location, $uibModal, $scope, $rootScope, $state, $timeout, growl, UxService, 
      ElementService, UtilsService, ViewService, ProjectService, MmsAppUtils, ToolbarService, ButtonBarService, TreeService) {

      this.$anchorScroll = $anchorScroll;
      this.$q = $q;
      this.$filter = $filter;
      this.$location = $location;
      this.$uibModal = $uibModal;
      this.$scope = $scope;
      this.$rootScope = $rootScope;
      this.$state = $state;
      this.$timeout = $timeout;
      this.growl = growl;
      this.UxService = UxService;
      this.ElementService = ElementService;
      this.UtilsService = UtilsService;
      this.ViewService = ViewService;
      this.ProjectService = ProjectService;
      this.MmsAppUtils = MmsAppUtils;
      this.treeControl = TreeService;

      this.$rootScope.ve_treeApi = this.treeControl;

      this.filterInputPlaceholder = 'Filter groups/docs';
      if (this.$state.includes('project.ref.document')) {
        this.filterInputPlaceholder = 'Filter table of contents';
      }

      
      //this.$rootScope.ve_bbApi = this.bbApi;
      this.$rootScope.ve_tree_pane = this;
      if (!this.$rootScope.veTreeShowPe) {
        this.$rootScope.veTreeShowPe = false;
      }

      this.tbApi = ToolbarService;
      this.treeButtons = [];
      this.treeOptions = {}

      this.bbApi = ButtonBarService;
      this.buttons = [];
            
      this.initialSelection = $rootScope.ve_treeInitial;

      this.$rootScope.ve_fullDocMode = false;
      if (this.$state.includes('project.ref.document.full')) {
        this.$rootScope.ve_fullDocMode = true;
      }

      this.resolvedBindings = 0;
      
    }

    $onInit = () => {
      this.$rootScope.mms_refOb = this.refOb;

      this.tbInit();
      this.bbInit();

      this.viewId2node = {};
      this.seenViewIds = {};

      this.tableList = [];
      this.figureList = [];
      this.equationList = [];
      this.treeViewModes = [{
        id: 'table',
        title: 'Tables',
        icon: 'fa-table',
        branchList: this.tableList
      }, {
        id: 'figure',
        title: 'Figures',
        icon: 'fa-image',
        branchList: this.figureList
      }, {
        id: 'equation',
        title: 'Equations',
        icon: 'fa-superscript',
        branchList: this.equationList
      }];

      // Set active tree view to tree
      this.toggle('showTree');

      this.$scope.$on('tree-expand', () => {
        this.treeControl.expand_all(this.treeData, this.treeOptions);
      });

      this.$scope.$on('tree-collapse', () => {
        this.treeControl.collapse_all(this.treeData, this.treeOptions);
      });

      this.$scope.$on('tree-add-document', () => {
        this.addItem('Document');
      });

      this.$scope.$on('tree-delete-document', () => {
        this.deleteItem();
      });

      this.$scope.$on('tree-add-view', () => {
        this.addItem('View');
      });

      this.$scope.$on('tree-delete', () => {
        this.deleteItem();
      });

      this.$scope.$on('tree-delete-view', () => {
        this.deleteItem((deleteBranch) =>  {
          this.$rootScope.$broadcast('mms-full-doc-view-deleted', deleteBranch);
        });
      });

      this.$scope.$on('tree-reorder-view', () => {
        this.$rootScope.ve_fullDocMode = false;
        this.bbApi.setToggleState("tree-full-document", false);
        this.$state.go('project.ref.document.order', {search: undefined});
      });

      this.$scope.$on('tree-reorder-group', () => {
        this.$state.go('project.ref.groupReorder');
      });

      this.$scope.$on('tree-add-group', () => {
        this.addItem('Group');
      });

      this.$scope.$on('tree-show-pe', () => {
        this.toggle('showTree');
        this.$rootScope.veTreeShowPe = true;
        this.setPeVisibility(this.viewId2node[this.documentOb.id]);
        this.treeControl.refresh(this.treeData, this.treeOptions);
      });

      this.$scope.$on('tree-show-views', () => {
        this.toggle('showTree');
        this.$rootScope.veTreeShowPe = false;
        this.setPeVisibility(this.viewId2node[this.documentOb.id]);
        this.treeControl.refresh(this.treeData, this.treeOptions);
      });

      this.$scope.$on('tree-show-tables', () => {
        this.toggle('table');
      });
      this.$scope.$on('tree-show-figures', () => {
        this.toggle('figure');
      });
      this.$scope.$on('tree-show-equations', () => {
        this.toggle('equation');
      });

      this.$scope.$on('tree-full-document', () => {
        this.fullDocMode();
      });

      // MmsAppUtils.addElementCtrl creates this event when adding sections, table and figures to the view
      this.$scope.$on('viewctrl.add.element', (event, instanceSpec, elemType, parentBranchData) =>  {
        if (elemType === 'paragraph' || elemType === 'list' || elemType === 'comment')
          return;
        var branch = this.treeControl.get_branch(parentBranchData, this.treeData, this.treeOptions);
        var viewId = null;
        if (branch.type === 'section') {
          viewId = branch.viewId;
        } else {
          viewId = branch.data.id;
        }
        var viewNode = this.viewId2node[viewId];
        var newbranch = {
          label: instanceSpec.name,
          type: (elemType === 'image' ? 'figure' : elemType),
          viewId: viewId,
          data: instanceSpec,
          hide: !this.$rootScope.veTreeShowPe && elemType !== 'section',
          children: []
        };
        var i = 0;
        var lastSection = -1;
        var childViewFound = false;
        for (i = 0; i < branch.children.length; i++) {
          if (branch.children[i].type === 'view') {
            lastSection = i-1;
            childViewFound = true;
            break;
          }
        }
        if (lastSection === -1 && !childViewFound) {//case when first child is view
          lastSection = branch.children.length-1;
        }
        branch.children.splice(lastSection+1, 0, newbranch);
        if (elemType === 'section') {
          this.addSectionElements(instanceSpec, viewNode, newbranch);
        }
        this.treeControl.refresh(this.treeData, this.treeOptions);
        this.resetPeTreeList(elemType);
      });

      // Utils creates this event when deleting instances from the view
      this.$scope.$on('viewctrl.delete.element', (event, elementData) =>  {
        var branch = this.treeControl.get_branch(elementData, this.treeData, this.treeOptions);
        if (branch) {
          this.treeControl.remove_single_branch(branch, this.treeData);
        }
        this.resetPeTreeList(branch.type);
      });

      this.$scope.$on('view.reorder.saved', (event, vid) =>  {
        var node = this.viewId2node[vid];
        var viewNode = node;
        var newChildren = [];
        for (var i = 0; i < node.children.length; i++) {
          var child = node.children[i];
          if (child.type === 'view') {
            newChildren.push(child);
          }
        }
        node.children = newChildren;
        if (node.type === 'section') {
          viewNode = this.viewId2node[node.view];
          if (!viewNode) {
            viewNode = node;
          }
        }
        this.addSectionElements(node.data, viewNode, node);
      });
    }
  $onChanges = (changes) => {
      for (const [name, binding] of Object.entries(changes)) {
        this[name] = angular.copy(changes[name].currentValue);
        console.log(name + ':');
        console.log(changes[name].currentValue.id);
      }

      

      this.treeOptions = {
        types: this.UxService.getTreeTypes(),
        sectionNumbering: this.$state.includes('project.ref.document') ? true : false,
        numberingDepth: 0,
        numberingSeparator: '.',
        expandLevel: this.$state.includes('project.ref.document') ? 3 : (this.$state.includes('project.ref') ? 0 : 1),
        search: '',
        onSelect: this.treeClickHandler,
        onDblclick: this.treeDblclickHandler,
        sort: this.$state.includes('project.ref.document') ? null : this.treeSortFunction
      };
      if (this.documentOb && this.docMeta) {
        this.treeOptions.numberingDepth = this.docMeta.numberingDepth;
        this.treeOptions.numberingSeparator = this.docMeta.numberingSeparator;
        this.treeOptions.startChapter = this.documentOb._startChapter;
      }

      this.docEditable = false;
      if(this.documentOb !== undefined && this.refOb !== undefined) {
        this.docEditable = this.documentOb && this.documentOb._editable && this.refOb.type === 'Branch' && this.UtilsService.isView(this.documentOb);
      }

      if(this.documentOb !== undefined && this.groupObs !== undefined && this.projectOb !== undefined && this.refOb !== undefined) {
        console.log('Ready Player One!')
        this.updateTreeData();
      }
        

    }

    updateTreeData = () => {

      if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
        console.log('1')
        this.treeData = this.UtilsService.buildTreeHierarchy(this.groupObs, "id", "group", "_parentId", this.groupLevel2Func);
        this.ViewService.getProjectDocuments({
          projectId: this.projectOb.id,
          refId: this.refOb.id
        }, 2).then((documentObs) => {
          for (var i = 0; i < documentObs.length; i++) {
            if (!documentObs[i]._groupId || documentObs[i]._groupId == this.projectOb.id) {
              this.treeData.push({
                label: documentObs[i].name,
                type: 'view',
                data: documentObs[i],
                children: []
              });
            }
          }
          if (this.treeControl.initialSelect) {
            this.treeControl.initialSelect(this.treeData, this.treeOptions);
          }
        });
      } else {
        if (!this.documentOb._childViews) {
          this.documentOb._childViews = [];
        }
        this.MmsAppUtils.handleChildViews(this.documentOb, 'composite', undefined, this.projectOb.id, this.refOb.id, this.handleSingleView, this.handleChildren)
          .then((node) => {
            var bulkGet = [];
            for (var i in this.viewId2node) {
              var view = this.viewId2node[i].data;
              if (view._contents && view._contents.operand) {
                for (var j = 0; j < view._contents.operand.length; j++) {
                  bulkGet.push(view._contents.operand[j].instanceId);
                }
              }
            }
            this.ElementService.getElements({
              elementIds: bulkGet,
              projectId: this.projectOb.id,
              refId: this.refOb.id
            }, 0).finally(() => {
              for (var i in this.viewId2node) {
                this.addSectionElements(this.viewId2node[i].data, this.viewId2node[i], this.viewId2node[i], true);
              }
              this.treeControl.refresh(this.treeData, this.treeOptions);
            });
          }, (reason) =>  {
            console.log(reason);
          });
        this.treeData = [this.viewId2node[this.documentOb.id]];
      }
    };


    tbInit = () => {
      if (this.$state.includes('project.ref.document')) {
        var viewModeButton = this.UxService.getButtonBarButton("view-mode-dropdown");
        this.tbApi.addButton(viewModeButton, this.treeButtons);
        this.tbApi.select(viewModeButton, this.$rootScope.veTreeShowPe ? this.UxService.getButtonBarButton('tree-show-pe') : this.UxService.getButtonBarButton('tree-show-views'), this.treeButtons);
      }
    };

    bbInit = () => {
      this.bbApi.addButton(this.UxService.getButtonBarButton("tree-expand"), this.buttons);
      this.bbApi.addButton(this.UxService.getButtonBarButton("tree-collapse"), this.buttons);
      if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-reorder-group"), this.buttons);
        this.bbApi.setPermission("tree-reorder-group", this.projectOb && this.projectOb._editable, this.buttons);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-add-document-or-group"), this.buttons);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-delete-document"), this.buttons);
        this.bbApi.setPermission( "tree-add-document-or-group", this.documentOb._editable && (this.refOb.type !== 'Tag'), this.buttons);
        this.bbApi.setPermission( "tree-delete-document", this.documentOb._editable &&  (this.refOb.type !== 'Tag'), this.buttons);
      } else if (this.$state.includes('project.ref.document')) {
        // $scope.tbApi.addButton(UxService.getButtonBarButton("view-mode-dropdown"));
        //$scope.bbApi.setToggleState('tree-show-pe', $rootScope.veTreeShowPe);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-reorder-view"), this.buttons);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-full-document"), this.buttons);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-add-view"), this.buttons);
        this.bbApi.addButton(this.UxService.getButtonBarButton("tree-delete-view"), this.buttons);
        this.bbApi.setPermission("tree-add-view", this.docEditable, this.buttons);
        this.bbApi.setPermission("tree-reorder-view", this.docEditable, this.buttons);
        this.bbApi.setPermission("tree-delete-view", this.docEditable, this.buttons);
        if (this.$rootScope.ve_fullDocMode) {
          this.bbApi.setToggleState('tree-full-document', true, this.buttons);
        }
      }
    };


    toggle = (id) => {
      this.activeMenu = id;
    };




    // Get a list of specific PE type from branch
    getPeTreeList = (branch, type, list) => {
      if ( branch.type === type) {
        list.push(branch);
      }
      for (var i = 0; i < branch.children.length; i++) {
        this.getPeTreeList(branch.children[i], type, list);
      }
    }

    // Function to refresh table and figure list when new item added, deleted or reordered
    resetPeTreeList = (elemType) => {
      if (elemType == 'table' || elemType == 'all') {
        this.tableList.length = 0;
        this.getPeTreeList(this.viewId2node[this.documentOb.id], 'table', this.tableList);
      }
      if (elemType == 'figure' || elemType == 'image' || elemType == 'all') {
        this.figureList.length = 0;
        this.getPeTreeList(this.viewId2node[this.documentOb.id], 'figure', this.figureList);
      }
      if (elemType == 'equation' || elemType == 'all') {
        this.equationList.length = 0;
        this.getPeTreeList(this.viewId2node[this.documentOb.id], 'equation', this.equationList);
      }
    }



    groupLevel2Func = (groupOb, groupNode) => {
      groupNode.loading = true;
      this.ViewService.getProjectDocuments({
        projectId: this.projectOb.id,
        refId: this.refOb.id
      }, 2).then((documentObs) => {
        var docs = [];
        var docOb, i;
        for (i = 0; i < documentObs.length; i++) {
          docOb = documentObs[i];
          if (docOb._groupId === groupOb.id) {
            docs.push(docOb);
          }
        }
        for (i = 0; i < docs.length; i++) {
          docOb = docs[i];
          groupNode.children.unshift({
            label: docOb.name,
            type: this.refOb.type === 'Branch' ? 'view' : 'snapshot',
            data: docOb,
            group: groupOb,
            children: []
          });
        }
        groupNode.loading = false;
        if (this.treeControl.initialSelect) {
          this.treeControl.initialSelect(this.treeData, this.treeOptions);
        }
      });
    };


    handleSingleView = (v, aggr) => {
      var curNode = this.viewId2node[v.id];
      if (!curNode) {
        curNode = {
          label: v.name,
          type: 'view',
          data: v,
          children: [],
          loading: true,
          aggr: aggr
        };
        this.viewId2node[v.id] = curNode;
      }
      return curNode;
    };


    handleChildren = (curNode, childNodes) =>  {
      var newChildNodes = [];
      var node;
      for (var i = 0; i < childNodes.length; i++) {
        node = childNodes[i];
        if (this.seenViewIds[node.data.id]) {
          this.growl.error("Warning: View " + node.data.name + " have multiple parents! Duplicates not shown.");
          continue;
        }
        this.seenViewIds[node.data.id] = node;
        newChildNodes.push(node);
      }
      curNode.children.push.apply(curNode.children, newChildNodes);
      curNode.loading = false;
      if (this.treeControl.refresh) {
        this.treeControl.refresh(this.treeData, this.treeOptions);
      }
    };


    processDeletedViewBranch = (branch) =>  {
      var id = branch.data.id;
      if (this.seenViewIds[id]) {
        delete this.seenViewIds[id];
      }
      if (this.viewId2node[id]) {
        delete this.viewId2node[id];
      }
      for (var i = 0; i < branch.children.length; i++) {
        this.processDeletedViewBranch(branch.children[i]);
      }
    };


    addSectionElements = (element, viewNode, parentNode, initial?) => {
      var contents = null;

      const addContentsSectionTreeNode = (operand) =>  {
        var bulkGet = [];
        var i = 0;
        for (i = 0; i < operand.length; i++) {
          bulkGet.push(operand[i].instanceId);
        }
        this.ElementService.getElements({
          elementIds: bulkGet,
          projectId: this.projectOb.id,
          refId: this.refOb.id,
        }, 0).then((ignore) => {
          var instances = [];
          for (var i = 0; i < operand.length; i++) {
            instances.push(this.ElementService.getElement({
              projectId: this.projectOb.id,
              refId: this.refOb.id,
              elementId: operand[i].instanceId,
            }, 0));
          }
          this.$q.all(instances).then((results) =>{
            var k = results.length - 1;
            for (; k >= 0; k--) {
              var instance = results[k];
              var hide = !this.$rootScope.veTreeShowPe;
              if (this.ViewService.isSection(instance)) {
                var sectionTreeNode = {
                  label : instance.name,
                  type : "section",
                  viewId : viewNode.data.id,
                  data : instance,
                  children: []
                };
                this.viewId2node[instance.id] = sectionTreeNode;
                parentNode.children.unshift(sectionTreeNode);
                this.addSectionElements(instance, viewNode, sectionTreeNode, initial);
              } else if (this.ViewService.getTreeType(instance)) {
                var otherTreeNode = {
                  label : instance.name,
                  type : this.ViewService.getTreeType(instance),
                  viewId : viewNode.data.id,
                  data : instance,
                  hide: hide,
                  children: []
                };
                parentNode.children.unshift(otherTreeNode);
              }
            }
            this.treeControl.refresh(this.treeData, this.treeOptions);
            if (initial) {
              this.treeControl.initialSelect(this.treeData, this.treeOptions);
            }
            this.resetPeTreeList('all');
          }, (reason) => {
            //view is bad
          });
        }, (reason) => {
        });
      };

      if (element._contents) {
        contents = element._contents;
      } else if (this.ViewService.isSection(element) && element.specification) {
        contents = element.specification; // For Sections, the contents expression is the specification
      } else {
        //bad?
      }
      if (contents && contents.operand) {
        addContentsSectionTreeNode(contents.operand);
      }
    }

    treeClickHandler = (branch) =>  {
      if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
        if (branch.type === 'group') {
          this.$state.go('project.ref.preview', {documentId: 'site_' + branch.data.id + '_cover', search: undefined});
        } else if (branch.type === 'view' || branch.type === 'snapshot') {
          this.$state.go('project.ref.preview', {documentId: branch.data.id, search: undefined});
        }
      } else if (this.$state.includes('project.ref.document')) {
        var viewId = (branch.type !== 'view') ? branch.viewId : branch.data.id;
        // var sectionId = branch.type === 'section' ? branch.data.id : null;
        var hash = branch.data.id;
        if (this.$rootScope.ve_fullDocMode) {
          this.$rootScope.$broadcast('mms-tree-click', branch);
        } else if (branch.type === 'view' || branch.type === 'section') {
          this.$state.go('project.ref.document.view', {viewId: branch.data.id, search: undefined});
        } else {
          this.$state.go('project.ref.document.view', {viewId: viewId, search: undefined});
          this.$timeout(() => {
            this.$location.hash(hash);
            this.$anchorScroll();
          }, 1000, false);
        }
      }
      //$rootScope.ve_tbApi.select('element-viewer');
    };

    treeDblclickHandler = (branch) =>  {
      if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
        if (branch.type === 'group')
          this.treeControl.expand_branch(branch, this.treeData, this.treeOptions);
        else if (branch.type === 'view' || branch.type === 'snapshot') {
          this.$state.go('project.ref.document', {documentId: branch.data.id, search: undefined});
        }
      } else if (this.$state.includes('project.ref.document')) {
        this.treeControl.expand_branch(branch, this.treeData, this.treeOptions);
      }
    };

    // TODO: Update sort function to handle all cases
    treeSortFunction = (a, b) =>  {

      a.priority = 100;
      if (a.type === 'tag') {
        a.priority = 0 ;
      } else if (a.type === 'group') {
        a.priority = 1;
      } else if (a.type === 'view') {
        a.priority = 2;
      }
      b.priority = 100;
      if (b.type === 'tag') {
        b.priority = 0 ;
      } else if (b.type === 'group') {
        b.priority = 1;
      } else if (b.type === 'view') {
        b.priority = 2;
      }

      if (a.priority < b.priority)
        return -1;
      if (a.priority > b.priority)
        return 1;
      if (!a.label) {
        a.label = '';
      }
      if (!b.label) {
        b.label = '';
      }
      if (a.label.toLowerCase() < b.label.toLowerCase())
        return -1;
      if (a.label.toLowerCase() > b.label.toLowerCase())
        return 1;
      return 0;
    };



    fullDocMode = () => {
      if (this.$rootScope.ve_fullDocMode) {
        this.$rootScope.ve_fullDocMode = false;
        this.bbApi.setToggleState("tree-full-document", false);
        var curBranch = this.treeControl.get_selected_branch();
        if (curBranch) {
          var viewId;
          if (curBranch.type !== 'view') {
            if (curBranch.type === 'section' && curBranch.data.type === 'InstanceSpecification') {
              viewId = curBranch.data.id;
            } else {
              viewId = curBranch.viewId;
            }
          } else {
            viewId = curBranch.data.id;
          }
          this.$state.go('project.ref.document.view', {viewId: viewId, search: undefined});
        }
      } else {
        this.$rootScope.ve_fullDocMode = true;
        this.bbApi.setToggleState("tree-full-document", true);
        this.$state.go('project.ref.document.full', {search: undefined});
      }
    };

    addItem = (itemType) =>  {
      this.itemType = itemType;
      this.newViewAggr = {type: 'shared'};
      var branch = this.treeControl.get_selected_branch();
      var templateUrlStr = "";
      var newBranchType = "";

      if (itemType === 'Document') {
        if (!branch) {
          this.parentBranchData = {id: "holding_bin_" + this.projectOb.id};
        } else if (branch.type !== 'group') {
          this.growl.warning("Select a group to add document under");
          return;
        } else {
          this.parentBranchData = branch.data;
        }
        templateUrlStr = 'partials/mms/new-doc-or-group.html';
        newBranchType = 'view';
      } else if (itemType === 'Group') {
        if (branch && branch.type === 'group') {
          this.parentBranchData = branch.data;
        } else {
          this.parentBranchData = {id: "holding_bin_" + this.projectOb.id};
          // Always create group at root level if the selected branch is not a group branch
          branch = null;
        }
        templateUrlStr = 'partials/mms/new-doc-or-group.html';
        newBranchType = 'group';
      } else if (itemType === 'View') {
        if (!branch) {
          this.growl.warning("Add View Error: Select parent view first");
          return;
        } else if (branch.type === "section") {
          this.growl.warning("Add View Error: Cannot add a child view to a section");
          return;
        } else if (branch.aggr === 'none') {
          this.growl.warning("Add View Error: Cannot add a child view to a non-owned and non-shared view.");
          return;
        }
        this.parentBranchData = branch.data;
        templateUrlStr = 'partials/mms/new-view.html';
        newBranchType = 'view';
      } else {
        this.growl.error("Add Item of Type " + itemType + " is not supported");
        return;
      }
      // Adds the branch:
      var instance = this.$uibModal.open({
        templateUrl: templateUrlStr,
        scope: this.$scope,
        controller: ['$scope', '$uibModalInstance', '$filter', this.addItemCtrl]
      });
      instance.result.then((data) => {
        if (!this.$rootScope.ve_editmode) {
          this.$timeout(() => {
            $('.show-edits').click();
          }, 0, false);
        }
        var newbranch = {
          label: data.name,
          type: newBranchType,
          data: data,
          children: [],
          aggr: null,
        };
        var top = itemType === 'Group' ? true : false;
        this.treeControl.add_branch(branch, newbranch, top, this.treeData, this.treeOptions);

        const addToFullDocView = (node, curSection, prevSysml) =>  {
          var lastChild = prevSysml;
          if (node.children) {
            var num = 1;
            for (var i = 0; i < node.children.length; i++) {
              var cNode = node.children[i];
              this.$rootScope.$broadcast('mms-new-view-added', cNode.data.id, curSection + '.' + num, lastChild);
              lastChild = addToFullDocView(cNode, curSection + '.' + num, cNode.data.id);
              num = num + 1;
            }
          }
          return lastChild;
        };

        if (itemType === 'View') {
          this.viewId2node[data.id] = newbranch;
          this.seenViewIds[data.id] = newbranch;
          newbranch.aggr = this.newViewAggr.type;
          var curNum = branch.children[branch.children.length-1].section;
          var prevBranch = this.treeControl.get_prev_branch(newbranch, this.treeData);
          while (prevBranch.type !== 'view') {
            prevBranch = this.treeControl.get_prev_branch(prevBranch, this.treeData);
          }
          this.MmsAppUtils.handleChildViews(data, this.newViewAggr.type, undefined, this.projectOb.id, this.refOb.id, this.handleSingleView, this.handleChildren)
            .then((node) =>  {
              // handle full doc mode
              if (this.$rootScope.ve_fullDocMode) {
                addToFullDocView(node, curNum, newbranch.data.id);
              }
              this.addViewSectionsRecursivelyForNode(node);
            });
          if (!this.$rootScope.ve_fullDocMode) {
            this.$state.go('project.ref.document.view', {viewId: data.id, search: undefined});
          } else {
            if (prevBranch) {
              this.$rootScope.$broadcast('mms-new-view-added', data.id, curNum, prevBranch.data.id);
            } else {
              this.$rootScope.$broadcast('mms-new-view-added', data.id, curNum, branch.data.id);
            }
          }
        }
      });
    };

    addItemCtrl = ($scope, $uibModalInstance) => {
      this.createForm = true;
      this.oking = false;
      var displayName = "";

      if (this.itemType === 'Document') {
        this.newDoc = {name: ''};
        displayName = "Document";
      } else if (this.itemType === 'View') {
        this.newView = {name: ''};
        displayName = "View";
      } else if (this.itemType === 'Group') {
        this.newGroup = {name: ''};
        displayName = "Group";
      } else {
        this.growl.error("Add Item of Type " + this.itemType + " is not supported");
        return;
      }

      const addExistingView = (view) =>  {
        var viewId = view.id;
        if (this.seenViewIds[viewId]) {
          this.growl.error("Error: View " + view.name + " is already in this document.");
          return;
        }
        if (this.oking) {
          this.growl.info("Please wait...");
          return;
        }
        this.oking = true;
        this.ViewService.addViewToParentView({
          parentViewId: this.parentBranchData.id,
          viewId: viewId,
          projectId: this.parentBranchData._projectId,
          refId: this.parentBranchData._refId,
          aggr: this.newViewAggr.type
        }).then((data) =>  {
          this.ElementService.getElement({
            elementId: viewId,
            projectId: view._projectId,
            refId: view._refId
          }, 2, false)
            .then((realView) =>  {
              $uibModalInstance.close(realView);
            }, () => {
              $uibModalInstance.close(view);
            }).finally(() => {
            this.growl.success("View Added");
          });
        }, (reason) =>  {
          this.growl.error("View Add Error: " + reason.message);
        }).finally(() => {
          this.oking = false;
        });
      };


      const queryFilter = () => {
        return {
          terms: {'_appliedStereotypeIds': [this.UtilsService.VIEW_SID, this.UtilsService.DOCUMENT_SID].concat(this.UtilsService.OTHER_VIEW_SID)}
        };
      };

      this.searchOptions = {
        callback: addExistingView,
        itemsPerPage: 200,
        filterQueryList: [queryFilter],
        hideFilterOptions: true
      };

      const ok = () => {
        if (this.oking) {
          this.growl.info("Please wait...");
          return;
        }
        this.oking = true;
        var promise;

        // Item specific promise: //TODO branch and tags
        if (this.itemType === 'Document') {
          promise = this.ViewService.createDocument({
            _projectId: this.projectOb.id,
            _refId: this.refOb.id,
            id: this.parentBranchData.id
          },{
            viewName: this.newDoc.name,
            isDoc: true
          });
        } else if (this.itemType === 'View') {
          this.newViewAggr.type = "composite";
          promise = this.ViewService.createView(this.parentBranchData, {
            viewName: this.newView.name
          });
        } else if (this.itemType === 'Group') {
          promise = this.ViewService.createGroup(this.newGroup.name,
            {
              _projectId: this.projectOb.id,
              _refId: this.refOb.id,
              id: this.parentBranchData.id
            }, this.orgOb.id
          );
        } else {
          this.growl.error("Add Item of Type " + this.itemType + " is not supported");
          this.oking = false;
          return;
        }

        promise.then((data) =>  {
          this.growl.success(displayName+" Created");
          if (this.itemType === 'Tag') {
            this.growl.info('Please wait for a completion email prior to viewing of the tag.');
          }
          $uibModalInstance.close(data);
        }, (reason) =>  {
          this.growl.error("Create "+displayName+" Error: " + reason.message);
        }).finally(() => {
          this.oking = false;
        });
      };

      const cancel = () => {
        $uibModalInstance.dismiss();
      };
    };

    deleteItem = (cb?) => {
      var branch = this.treeControl.get_selected_branch();
      if (!branch) {
        this.growl.warning("Select item to remove.");
        return;
      }
      var type = this.ViewService.getElementType(branch.data);
      if (this.$state.includes('project.ref.document')) {
        if (type == 'Document') {
          this.growl.warning("Cannot remove a document from this view. To remove this item, go to project home.");
          return;
        }
        if (branch.type !== 'view' || (!this.UtilsService.isView(branch.data))) {
          this.growl.warning("Cannot remove non-view item. To remove this item, open it in the center pane.");
          return;
        }
      }

      // when in project.ref state, allow deletion for view/document/group
      if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
        if (branch.type !== 'view' && !this.UtilsService.isDocument(branch.data) && (branch.type !== 'group' || branch.children.length > 0) ) {
          this.growl.warning("Cannot remove group with contents. Empty contents and try again.");
          return;
        }
      }
      this.removeObject = branch;
      var instance = this.$uibModal.open({
        scope: this.$scope,
        component: 'confirmRemove'
      });
      instance.result.then((data) =>  {
        this.treeControl.remove_branch(branch, this.treeData, this.treeOptions);
        if (this.$state.includes('project.ref.document') && branch.type === 'view') {
          this.processDeletedViewBranch(branch);
        }
        if (this.$rootScope.ve_fullDocMode) {
          cb(branch);
        } else {
          this.treeControl.clear_selected_branch();
          this.$state.go('^', {search: undefined});
        }
      });
    };

    addViewSections = (view) => {
      var node = this.viewId2node[view.id];
      this.addSectionElements(view, node, node);
    }

    addViewSectionsRecursivelyForNode = (node) => {
      this.addViewSections(node.data);
      for (var i = 0; i < node.children.length; i++) {
        if (node.children[i].type === 'view') {
          this.addViewSectionsRecursivelyForNode(node.children[i]);
        }
      }
    }

    setPeVisibility = (branch) => {
      if (branch.type === 'figure' || branch.type === 'table' || branch.type === 'equation') {
        branch.hide = !this.$rootScope.veTreeShowPe;
      }
      for (var i = 0; i < branch.children.length; i++) {
        this.setPeVisibility(branch.children[i]);
      }
    }

    

    //TODO refresh table and fig list when new item added, deleted or reordered
    user_clicks_branch = (branch, treeData, options) =>  {
      this.treeControl.user_clicks_branch(branch, treeData, options);
    };

    searchInputChangeHandler = function () {
      if (this.treeControl.options.search === '') {
        this.treeControl.collapse_all(this.treeData, this.options);
        this.treeControl.expandPathToSelectedBranch(this.treeData, this.options);
      } else {
        // expand all branches so that the filter works correctly
        this.treeControl.expand_all();
      }
    };

  }
}

mmsApp.component(TreePaneComponent.selector,TreePaneComponent);
