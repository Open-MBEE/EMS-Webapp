import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');



/* Interfaces (Temporary) */
// interface ToolbarApi extends Object {
//     init() : void
//     addButton(any) : void
//     setIcon(id : string, icon : string) : void
//     setPermission(id : string, permission : any) : void
// }

/* Classes */
let ToolbarComponent = {
    selector: "toolbarComponent", //toolbar-component
    template: `<mms-toolbar buttons="$ctrl.buttons" on-click="onClick(button)" mms-tb-api="$ctrl.tbApi" />`,
    bindings: {
        refOb: '<',
        documentOb: '<'
    },
    controller: class ToolbarController {
        static $inject = ['$rootScope', '$state', 'UxService', 'ToolbarService'];
        private $rootScope
        private $state
        private UxService

        public refOb
        public documentOb

        public tbApi;
        public buttons;

        constructor($rootScope, $state, UxService, ToolbarService) {
            this.$rootScope = $rootScope;
            this.$state = $state;
            this.UxService = UxService;
            this.tbApi = ToolbarService;
            this.buttons = [];

            $rootScope.ve_tbApi = this.tbApi;
            $rootScope.ve_tbButtons = this.buttons;
            //this.init();
        }

        $onInit = () => {
            this.tbApi.addButton(this.UxService.getToolbarButton("element-viewer"), this.buttons);
            this.tbApi.addButton(this.UxService.getToolbarButton("element-editor"), this.buttons);
            if (this.$rootScope.ve_edits && Object.keys(this.$rootScope.ve_edits).length > 0) {
                this.tbApi.setIcon('element-editor', 'fa-edit-asterisk', this.buttons);
                this.tbApi.setPermission('element-editor-saveall', true, this.buttons);
            }
            var editable = false;
            this.tbApi.addButton(this.UxService.getToolbarButton("element-history"), this.buttons);
            this.tbApi.addButton(this.UxService.getToolbarButton("tags"), this.buttons);
            // if ($state.includes('project.ref.document')) {
                //tbApi.addButton(UxService.getToolbarButton("jobs"));
            // }
            if (this.$state.includes('project.ref') && !this.$state.includes('project.ref.document')) {
                if(this.documentOb !== undefined) {
                    editable = this.documentOb._editable && this.refOb.type === 'Branch';
                }
                this.tbApi.setPermission('element-editor', editable, this.buttons);
                if (this.$state.includes('project.ref.preview')) {
                    this.tbApi.addButton(this.UxService.getToolbarButton("view-reorder"), this.buttons);
                    this.tbApi.setPermission("view-reorder", editable, this.buttons);
                }
            } else if (this.$state.includes('project.ref.document')) {
                if(this.documentOb !== undefined) {
                    editable = this.documentOb._editable && this.refOb.type === 'Branch';
                }
                this.tbApi.addButton(this.UxService.getToolbarButton("view-reorder"), this.buttons);
                this.tbApi.setPermission('element-editor', editable, this.buttons);
                this.tbApi.setPermission("view-reorder", editable, this.buttons);
        }
    };


    }
};

/* Controllers */

mmsApp.component(ToolbarComponent.selector, ToolbarComponent)
// .controller('ToolbarCtrl', ['$scope', '$rootScope', '$state', 'UxService', 'refOb', 'documentOb', 
// function($scope, $rootScope, $state, UxService, refOb, documentOb) {

//     var tbApi = (<ToolbarApi> {});
//     $scope.tbApi = tbApi;
//     $scope.buttons = [];

//     // TODO: Manage rootScope in controllers, for now set/get in one area of the code
//     // Set MMS $rootScope variables
//     $rootScope.ve_tbApi = tbApi;

//     tbApi.init = function()
//     {
//         tbApi.addButton(UxService.getToolbarButton("element-viewer"));
//         tbApi.addButton(UxService.getToolbarButton("element-editor"));
//         if ($rootScope.ve_edits && Object.keys($rootScope.ve_edits).length > 0) {
//             tbApi.setIcon('element-editor', 'fa-edit-asterisk');
//             tbApi.setPermission('element-editor-saveall', true);
//         }
//         var editable = false;
//         tbApi.addButton(UxService.getToolbarButton("element-history"));
//         tbApi.addButton(UxService.getToolbarButton("tags"));
//         // if ($state.includes('project.ref.document')) {
//             //tbApi.addButton(UxService.getToolbarButton("jobs"));
//         // }
//         if ($state.includes('project.ref') && !$state.includes('project.ref.document')) {
//             editable = documentOb._editable && refOb.type === 'Branch';
//             tbApi.setPermission('element-editor', editable);
//             if ($state.includes('project.ref.preview')) {
//                 tbApi.addButton(UxService.getToolbarButton("view-reorder"));
//                 tbApi.setPermission("view-reorder", editable);
//             }
//         } else if ($state.includes('project.ref.document')) {
//             editable = documentOb._editable && refOb.type === 'Branch';
//             tbApi.addButton(UxService.getToolbarButton("view-reorder"));
//             tbApi.setPermission('element-editor', editable);
//             tbApi.setPermission("view-reorder", editable);
//         }
//     };
// }]);