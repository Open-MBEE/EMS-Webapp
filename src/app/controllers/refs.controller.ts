import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


/* Controllers */

mmsApp.controller('RefsCtrl', ['$sce', '$q', '$filter', '$location', '$uibModal', '$scope', '$rootScope', '$state', '$timeout', '$window', 'growl', '_', 'flatpickr',
                         'ElementService', 'ProjectService', 'MmsAppUtils', 'ApplicationService',
                         'orgOb', 'projectOb', 'refOb', 'refObs', 'tagObs', 'branchObs',
function($sce, $q, $filter, $location, $uibModal, $scope, $rootScope, $state, $timeout, $window, growl, _, flatpickr,
    ElementService, ProjectService, MmsAppUtils, ApplicationService,
    orgOb, projectOb, refOb, refObs, tagObs, branchObs) {

    $rootScope.mms_refOb = refOb;
    $scope.refManageView = true;
    $scope.refData = [];
    $scope.bbApi = {};
    $scope.buttons = [];
    $scope.branches = branchObs;
    $scope.tags = tagObs;
    $scope.activeTab = 0;
    $scope.refSelected = null;
    $scope.search = null;
    $scope.view = null;
    $scope.fromParams = {};


    var selectMasterDefault = function() {
        var masterIndex = _.findIndex(refObs, {name: 'master'});
        if (masterIndex > -1) {
            $scope.fromParams = refObs[masterIndex];
            $scope.refSelected = refObs[masterIndex];
        }
    };

    if (_.isEmpty(refOb)) {
        selectMasterDefault();
    } else {
        $scope.fromParams = refOb;
        $scope.refSelected = refOb;
    }

    $scope.htmlTooltip = $sce.trustAsHtml('Branch temporarily unavailable during duplication.');
    // $scope.htmlTooltip = $sce.trustAsHtml('Branch temporarily unavailable during duplication.<br>Branch author will be notified by email upon completion.');
    // var refPerm = projectOb && projectOb._editable;

    $scope.addBranch = function(e) {
        addItem('Branch');
    };
    $scope.addTag = function(e) {
        addItem('Tag');
    };
    $scope.deleteRef = function(e) {
        deleteItem();
    };
    $scope.$on('fromParamChange', function(event, fromParams) {
        var index = _.findIndex(refObs, {name: fromParams.refId});
        if ( index > -1 ) {
            $scope.fromParams = refObs[index];
        }
    });
    $scope.$on("stomp.branchCreated", function(event, updateRef, projectId) {
        growl.success(updateRef.name + " " + updateRef.type + " Created");
    });

    $scope.refClickHandler = function(ref) {
        ProjectService.getRef(ref.id, projectOb.id).then(
            function(data) {
                $scope.refSelected = data;
            },
            function(error){
                growl.error("Ref click handler error: " + error );
                return;
            }
        );
    };

    var addItem = function(itemType) {
        $scope.itemType = itemType;
        var branch = $scope.refSelected;
        var templateUrlStr = "";

        // Item specific setup:
        if (itemType === 'Branch') {
            if (!branch) {
                growl.warning("Add Branch Error: Select a branch or tag first");
                return;
            }
            if (branch.type === 'Tag') {
                $scope.from = 'Tag ' + branch.name;
            } else {
                $scope.from = 'Branch ' + branch.name;
            }
            $scope.createParentRefId = branch.id;
            templateUrlStr = 'partials/mms/new-branch.html';
        } else if (itemType === 'Tag') {
            if (!branch) {
                growl.warning("Add Tag Error: Select a branch or tag first");
                return;
            }
            $scope.createParentRefId = branch.id;
            templateUrlStr = 'partials/mms/new-tag.html';
        } else {
            growl.error("Add Item of Type " + itemType + " is not supported");
            return;
        }
        // Adds the branch:
        var instance = $uibModal.open({
            templateUrl: templateUrlStr,
            scope: $scope,
            controller: ['$scope', '$uibModalInstance', '$filter', addItemCtrl]
        });
        instance.result.then(function(data) {
            //TODO add load handling once mms returns status
            var tag = [];
            for (var i = 0; i < refObs.length; i++) {
                if (refObs[i].type === "Tag")
                    tag.push(refObs[i]);
            }
            $scope.tags = tag;

            var branches = [];
            for (var j = 0; j < refObs.length; j++) {
                if (refObs[j].type === "Branch")
                    branches.push(refObs[j]);
            }
            $scope.branches = branches;
            if (data.type === 'Branch') {
                //data.loading = true;
                //$scope.branches.push(data);
                $scope.refSelected = data;
                $scope.activeTab = 0;
            } else {
                //data.loading = true;
                //$scope.tags.push(data);
                $scope.refSelected = data;
                $scope.activeTab = 1;
            }
        });
    };

    var addItemCtrl = function($scope, $uibModalInstance, $filter) {
        $scope.createForm = true;
        $scope.oking = false;
        var displayName = "";
        // Item specific setup:
        var now = new Date();
        if ($scope.itemType === 'Branch') {
            $scope.branch = {};
            $scope.branch.name = "";
            $scope.branch.description = "";
            $scope.branch.permission = "read";
            $scope.branch.lastCommit = true;
            $scope.branch.timestamp = now;
            displayName = "Branch";
            $scope.updateTimeOpt = function () {
                $scope.branch.lastCommit = false;
            };
        } else if ($scope.itemType === 'Tag') {
            $scope.tag = {};
            $scope.tag.name = "";
            $scope.tag.description = "";
            $scope.tag.lastCommit = true;
            $scope.tag.timestamp = now;
            displayName = "Tag";
            $scope.updateTimeOpt = function () {
                $scope.tag.lastCommit = false;
            };
        }

        $timeout(function() {
            flatpickr('.datetimepicker', {
                enableTime: true,
                enableSeconds: true,
                defaultDate: now,
                dateFormat: 'Y-m-dTH:i:S',
                time_24hr: true,
                maxDate: new Date(),
                onClose: function(selectedDates) {
                    $scope.$apply(function() {
                        $scope.updateTimeOpt();
                        if ($('.datetimepicker#branch').length ) {
                            $scope.branch.timestamp = selectedDates[0];
                        } else if($('.datetimepicker#tag').length ) {
                            $scope.tag.timestamp = selectedDates[0];
                        }
                    });
                }
            });
        });

        var handlePromise = function(promise) {
            promise.then(function(data) {
                growl.success(displayName + " is being created.");
                // growl.info('Please wait for a completion email prior to viewing of the '+$scope.itemType+'.', {ttl: -1});
                // refArr.push(refJson);
                // var storeArr = refArr.toString();
                // $window.localStorage.setItem('refArr', storeArr); 
                $uibModalInstance.close(data); //need to figure out a way to cache this stuff
            }, function(reason) {
                growl.error("Create " + displayName + " : " + reason.message);
            }).finally(function() {
                $scope.oking = false;
            });
        };

        $scope.ok = function() {
            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;
            var promise, ts;
            // Item specific promise:
            if ($scope.itemType === 'Branch' && $scope.branch.name !== '') {
                var branchObj = {
                    name: $scope.branch.name,
                    type: "Branch",
                    description: $scope.branch.description,
                    parentRefId: $scope.createParentRefId,
                    permission: $scope.branch.permission,
                    id: ApplicationService.createUniqueId(),
                    parentCommitId: ''
                };
                if (!$scope.branch.lastCommit) {
                    // Make call to history?maxTimestamp to get closest commit id to branch off
                    ts = $filter('date')($scope.branch.timestamp, 'yyyy-MM-ddTHH:mm:ss.sssZ');
                    ProjectService.getRefHistory(branchObj.parentRefId, projectOb.id, ts)
                    .then(function(commits) {
                        branchObj.parentCommitId = commits[0].id;
                        promise = ProjectService.createRef( branchObj, projectOb.id );
                        handlePromise(promise);
                    });
                } else {
                    promise = ProjectService.createRef( branchObj, projectOb.id );
                    handlePromise(promise);
                }
            } else if ($scope.itemType === 'Tag' && $scope.tag.name !== '') {
                var tagObj = {
                        name: $scope.tag.name, 
                        type: "Tag",
                        description: $scope.tag.description,
                        parentRefId:  $scope.createParentRefId,
                        id: ApplicationService.createUniqueId(),
                        parentCommitId: ''
                    };
                if (!$scope.tag.lastCommit) {
                    ts = $filter('date')($scope.tag.timestamp, 'yyyy-MM-ddTHH:mm:ss.sssZ');
                    ProjectService.getRefHistory(tagObj.parentRefId, projectOb.id, ts)
                    .then(function(commits) {
                        tagObj.parentCommitId = commits[0].id;
                        promise = ProjectService.createRef( tagObj, projectOb.id );
                        handlePromise(promise);
                    });
                } else {
                    promise = ProjectService.createRef( tagObj, projectOb.id );
                    handlePromise(promise);
                }
            } else {
                growl.error("Add Item of Type " + $scope.itemType + " is not supported");
                $scope.oking = false;
                return;
            }
        };

        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        };
    };

    var deleteItem = function() {
        var branch = $scope.refSelected;
        if (!branch) {
            growl.warning("Select item to delete.");
            return;
        }
        $scope.deleteBranch = branch;
        var instance = $uibModal.open({
            templateUrl: 'partials/mms/confirmDelete.html',
            scope: $scope,
            controller: ['$scope', '$uibModalInstance', deleteCtrl]
        });
        instance.result.then(function(data) {
            //TODO $state project with no selected ref
            var index;
            if ($scope.refSelected.type === 'Branch') {
                index = $scope.branches.indexOf($scope.refSelected);
                $scope.branches.splice(index, 1);
                selectMasterDefault();
            } else if ($scope.refSelected.type === 'Tag') {
                index = $scope.tags.indexOf($scope.refSelected);
                $scope.tags.splice(index, 1);
            }
            $scope.refSelected = null;
        });
    };

    var deleteCtrl = function($scope, $uibModalInstance) {
        $scope.oking = false;
        var branch = $scope.deleteBranch;
        if (branch.type === 'Tag') {
            $scope.type = 'Tag';
        } else if (branch.type === 'Branch') {
            $scope.type = 'Branch';
        }
        $scope.name = branch.name;
        $scope.ok = function() {
            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;
            var promise = ProjectService.deleteRef(branch.id, projectOb.id);
            promise.then(function(data) {
                growl.success($scope.type + " Deleted");
                $uibModalInstance.close('ok');
            }, function(reason) {
                growl.error($scope.type + ' Delete Error: ' + reason.message);
            }).finally(function() {
                $scope.oking = false;
            });
        };

        $scope.cancel = function() {
            $uibModalInstance.dismiss();
        };
    };


}]);
