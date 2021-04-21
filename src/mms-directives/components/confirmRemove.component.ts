import * as angular from 'angular';

var mmsDirectives = angular.module('mmsDirectives');

let ConfirmRemoveComponent = {
  selector: 'confirmRemove',
  template: `
  <div class="modal-header">
    <h4>Confirm Remove</h4>
</div>

<div class="modal-body">
    <p>Are you sure you want to remove {{$ctrl.removeType}} <b>&ldquo;{{$ctrl.removeName}}&rdquo;</b>?</p>
    <p ng-if="type != 'Document' && type != 'group'">This will remove <b>&ldquo;{{$ctrl.removeName}}&rdquo;</b> from the hierarchy, but you can still access it in search.</p>
    <p ng-if="type === 'Document' || type === 'group'">This will remove <b>&ldquo;{{$ctrl.removeName}}&rdquo;</b> from the project navigation, but you can still access it in search.</p>
</div>

<div class="modal-footer">
    <button class="btn btn-warning" ng-click="$ctrl.ok()">Remove <i ng-show="oking" class="fa fa-spin fa-spinner"></i></button>
    <button class="btn btn-default" ng-click="$ctrl.cancel()">Cancel</button>
</div>
  `,
  bindings : {
    modalInstance: '<'
  },
  controller: class ConfirmRemoveController {
    static $inject = ['$scope', 'UtilsService', 'growl', '$state', 'ViewService'];
    
    private $scope
    private modalInstance
    private UtilsService
    private growl
    private $state
    private ViewService

    private removeObject

    public oking
    public removeType
    public removeName


    constructor($scope, UtilsService, growl, $state, ViewService) {
      this.$scope = $scope;
      this.UtilsService = UtilsService;
      this.growl = growl;
      this.$state = $state;
      this.ViewService = ViewService;

      this.removeObject = this.$scope.removeObject;
      this.$scope.oking = false;
      this.removeType = this.removeObject.type;

      if (this.UtilsService.isDocument(this.removeObject.data)) {
        this.removeType = 'Document';
      }

      this.removeName = this.removeObject.data.name;

    }

    ok = () => {
        if (this.$scope.oking) {
          this.growl.info("Please wait...");
          return;
        }
        this.$scope.oking = true;
        var promise = null;
        if (this.removeType === 'view') {
          var parentObject = this.$scope.treeApi.get_parent_object(this.removeObject);
          if (!this.$state.includes('project.ref.document')) {
            promise = this.ViewService.downgradeDocument(this.removeObject.data);
          } else {
            promise = this.ViewService.removeViewFromParentView({
              projectId: parentObject.data._projectId,
              refId: parentObject.data._refId,
              parentViewId: parentObject.data.id,
              viewId: this.removeObject.data.id
            });
          }
        } else if (this.removeObject.type === 'group') {
          promise = this.ViewService.removeGroup(this.removeObject.data);
        }

        if (promise) {
          promise.then((data) => {
            this.growl.success(this.removeType + " Removed");
            this.modalInstance.close('ok');
          }, (reason) => {
            this.growl.error(this.removeType + ' Removal Error: ' + reason.message);
          }).finally(() => {
            this.$scope.oking = false;
          });
        } else {
          this.$scope.oking = false;
          this.modalInstance.dismiss();
        }
      };

      cancel = () => {
        this.modalInstance.dismiss();
      };
    }


  }

mmsDirectives.component(ConfirmRemoveComponent.selector, ConfirmRemoveComponent)