import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');
import { ElementObject } from '../../lib/elementOb';




/* Controllers */

mmsApp.controller('ToolCtrl', ['$scope', '$rootScope', '$state', '$uibModal', '$q', '$timeout', 'hotkeys',
            'ElementService', 'JobService', 'ProjectService', 'growl', 'projectOb', 'refOb', 'tagObs', 'branchObs', 'documentOb', 'viewOb', 'Utils',
function($scope, $rootScope, $state, $uibModal, $q, $timeout, hotkeys,
    ElementService, JobService, ProjectService, growl, projectOb, refOb, tagObs, branchObs, documentOb, viewOb, Utils) {

    $scope.specInfo = {
        refId: refOb.id,
        commitId: 'latest',
        projectId: projectOb.id,
        id: null
    };
    $scope.projectOb = projectOb;
    $scope.editable = documentOb && documentOb._editable && refOb.type === 'Branch';
    $scope.viewOb = viewOb;
    $scope.documentOb = documentOb;
    $scope.refOb = refOb;
    $scope.tagObs = tagObs;
    $scope.branchObs = branchObs;

    if (viewOb) {
        $scope.specInfo.id = viewOb.id;
        $scope.viewId = viewOb.id;
    } else if (documentOb) {
        $scope.specInfo.id = documentOb.id;
        $scope.viewId = documentOb.id;
    }

    $scope.specApi = {};
    $scope.viewContentsOrderApi = {};
    $rootScope.ve_togglePane = $scope.$pane;

    $scope.show = {
        element: true,
        history: false,
        tags: false,
        reorder: false,
        jobs: false
    };
    $scope.tracker = {};
    if (!$rootScope.ve_edits)
        $rootScope.ve_edits = {};

    // Set edit count for tracker view
    $scope.veEditsLength = function() {
        return Object.keys($rootScope.ve_edits).length;
    };

    $scope.etrackerChange = function() {
        $scope.specApi.keepMode();
        var id = $scope.tracker.etrackerSelected;
        if (!id)
            return;
        var info = id.split('|');
        $scope.specInfo.id = info[0];
        $scope.specInfo.projectId = info[1];
        $scope.specInfo.refId = info[2];
        $scope.specInfo.commitId = 'latest';
        $rootScope.ve_tbApi.setPermission('element-editor', true, $rootScope.ve_tbButtons);
    };

    var showPane = function(pane) {
        angular.forEach($scope.show, function(value, key) {
            if (key === pane)
                $scope.show[key] = true;
            else
                $scope.show[key] = false;
        });
    };

    // Check edit count and toggle appropriate save all and edit/edit-asterisk buttons
    var cleanUpSaveAll = function() {
        if ($scope.veEditsLength() > 0) {
            $rootScope.ve_tbApi.setPermission('element-editor-saveall', true, $rootScope.ve_tbButtons);
            $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit-asterisk', $rootScope.ve_tbButtons);
        } else {
            $rootScope.ve_tbApi.setPermission('element-editor-saveall', false, $rootScope.ve_tbButtons);
            $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit', $rootScope.ve_tbButtons);
        }
    };

    $scope.$on('jobs', function() {
        showPane('jobs');
    });

    $scope.$on('element-history', function() {
        showPane('history');
    });

    $scope.$on('tags', function() {
        showPane('tags');
    });

    $scope.$on('gotoTagsBranches', function(){
        $rootScope.ve_tbApi.select('tags', $rootScope.ve_tbButtons);
        showPane('tags');
    });

    var cleanUpEdit = function(editOb, cleanAll?) {
        if (!Utils.hasEdits(editOb) || cleanAll) {
            var key = editOb.id + '|' + editOb._projectId + '|' + editOb._refId;
            delete $rootScope.ve_edits[key];
            cleanUpSaveAll();
        }
    };

    $scope.$on('presentationElem.edit', function(event, editOb) {
        var key = editOb.id + '|' + editOb._projectId + '|' + editOb._refId;
        $rootScope.ve_edits[key] = editOb;
        cleanUpSaveAll();
    });

    $scope.$on('presentationElem.save', function(event, editOb) {
        cleanUpEdit(editOb, true);
    });

    $scope.$on('presentationElem.cancel', function(event, editOb) {
        cleanUpEdit(editOb);
    });

    var elementSelected = (event, elementOb, commitId, displayOldContent?) => {
        $scope.specInfo.id = elementOb.id;
        $scope.specInfo.projectId = elementOb._projectId;
        $scope.specInfo.refId = elementOb._refId;
        $scope.specInfo.commitId = commitId ? commitId : elementOb._commitId;
        $scope.specInfo.mmsDisplayOldContent = displayOldContent;
        if($scope.show.element) {
            $rootScope.ve_tbApi.select('element-viewer', $rootScope.ve_tbButtons);
        }
        if ($scope.specApi.setEditing) {
            $scope.specApi.setEditing(false);
        }
        var editable = elementOb._editable && $scope.refOb.type === 'Branch' && commitId === 'latest' ;
        $rootScope.ve_tbApi.setPermission('element-editor', editable, $rootScope.ve_tbButtons);
        $rootScope.$digest();
    };
    $scope.$on('elementSelected', elementSelected);
    $scope.$on('element-viewer', function() {
        $scope.specApi.setEditing(false);
        cleanUpSaveAll();
        showPane('element');
    });
    $scope.$on('element-editor', function() {
        $scope.specApi.setEditing(true);
        showPane('element');
        var editOb = $scope.specApi.getEdits();
        if (editOb) {
            var key = editOb.id + '|' + editOb._projectId + '|' + editOb._refId;
            $scope.tracker.etrackerSelected = key;
            $rootScope.ve_edits[key] = editOb;
            cleanUpSaveAll();
        }
        ElementService.isCacheOutdated(editOb)
        .then(function(data) {
            if (data.status && data.server._modified > data.cache._modified)
                growl.error('This element has been updated on the server. Please refresh the page to get the latest version.');
        });
    });
    $scope.$on('viewSelected', function(event, elementOb, commitId) {
        elementSelected(event, elementOb, commitId);
        $scope.viewOb = elementOb;
        var editable = elementOb._editable && $scope.refOb.type === 'Branch' && commitId === 'latest';
        $scope.viewCommitId = commitId ? commitId : elementOb._commitId;
        $rootScope.ve_tbApi.setPermission('view-reorder', editable, $rootScope.ve_tbButtons);
    });

    $scope.$on('view-reorder.refresh', function() {
        $scope.viewContentsOrderApi.refresh();
    });

    $scope.$on('view-reorder', function() {
        $scope.viewContentsOrderApi.setEditing(true);
        showPane('reorder');
    });

    var elementSaving = false;
    $scope.$on('element-editor-save', function() {
        save(false);
    });
    $scope.$on('element-editor-saveC', function() {
        save(true);
    });
    var save = function(continueEdit) {
        if (elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        var edit = $scope.specApi.getEdits();
        Utils.clearAutosaveContent(edit._projectId + edit._refId + edit.id, edit.type);
        elementSaving = true;
        if (!continueEdit)
            $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-save', $rootScope.ve_tbButtons);
        else
            $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveC', $rootScope.ve_tbButtons);
        $timeout(function() {
        $scope.specApi.save().then(function(data) {
            elementSaving = false;
            growl.success('Save Successful');
            if (continueEdit)
                return;
            var edit = $scope.specApi.getEdits();
            var key = edit.id + '|' + edit._projectId + '|' + edit._refId;
            delete $rootScope.ve_edits[key];
            if (Object.keys($rootScope.ve_edits).length > 0) {
                var next = Object.keys($rootScope.ve_edits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.specInfo.id = id[0];
                $scope.specInfo.projectId = id[1];
                $scope.specInfo.refId = id[2];
                $scope.specInfo.commitId = 'latest';
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.ve_tbApi.select('element-viewer', $rootScope.ve_tbButtons);
                cleanUpSaveAll();
            }
        }, function(reason) {
            elementSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
        }).finally(function() {
            if (!continueEdit)
                $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-save', $rootScope.ve_tbButtons);
            else
                $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveC', $rootScope.ve_tbButtons);
        });
        }, 1000, false);
        $rootScope.ve_tbApi.select('element-editor', $rootScope.ve_tbButtons);
    };

    hotkeys.bindTo($scope)
    .add({
        combo: 'alt+a',
        description: 'save all',
        callback: function() {$scope.$broadcast('element-editor-saveall');}
    });
    var savingAll = false;
    $scope.$on('element-editor-saveall', function() {
        if (savingAll) {
            growl.info('Please wait...');
            return;
        }
        var ve_edits = $rootScope.ve_edits;
        if (Object.keys(ve_edits).length === 0) {
            growl.info('Nothing to save');
            return;
        }

        Object.values(ve_edits).forEach(function(ve_edit: ElementObject) {
           Utils.clearAutosaveContent(ve_edit._projectId + ve_edit._refId + ve_edit.id, ve_edit.type);
        });

        if ($scope.specApi && $scope.specApi.editorSave)
            $scope.specApi.editorSave();
        savingAll = true;
        $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveall', $rootScope.ve_tbButtons);
        ElementService.updateElements(Object.values($rootScope.ve_edits))
            .then(function(responses) {
                responses.forEach(function(elementOb) {
                    delete $rootScope.ve_edits[elementOb.id + '|' + elementOb._projectId + '|' + elementOb._refId];
                    $rootScope.$broadcast('element.updated', elementOb, false);
                    $rootScope.ve_tbApi.select('element-viewer', $rootScope.ve_tbButtons);
                    $scope.specApi.setEditing(false);
                });
                growl.success("Save All Successful");

            }, function(responses) {
                // reset the last edit elementOb to one of the existing element
                var elementToSelect = (<ElementObject> Object.values($rootScope.ve_edits)[0]);
                $scope.tracker.etrackerSelected = elementToSelect.id + '|' + elementToSelect._projectId + '|' + elementToSelect._refId;
                $scope.specApi.keepMode();
                $scope.specInfo.id = elementToSelect.id;
                $scope.specInfo.projectId = elementToSelect._projectId;
                $scope.specInfo.refId = elementToSelect._refId;
                $scope.specInfo.commitId = 'latest';
                growl.error("Some elements failed to save, resolve individually in edit pane");

            }).finally(function() {
                $rootScope.ve_tbApi.toggleButtonSpinner('element-editor-saveall');
                savingAll = false;
                cleanUpSaveAll();
                if (Object.keys($rootScope.ve_edits).length === 0) {
                    $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit', $rootScope.ve_tbButtons);
                }
            });
    });
    $scope.$on('element-editor-cancel', function() {
        var go = function() {
            var edit = $scope.specApi.getEdits();
            delete $rootScope.ve_edits[edit.id + '|' + edit._projectId + '|' + edit._refId];
            $scope.specApi.revertEdits();
            if (Object.keys($rootScope.ve_edits).length > 0) {
                var next = Object.keys($rootScope.ve_edits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.specInfo.id = id[0];
                $scope.specInfo.projectId = id[1];
                $scope.specInfo.refId = id[2];
                $scope.specInfo.commitId = 'latest';
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.ve_tbApi.select('element-viewer', $rootScope.ve_tbButtons);
                $rootScope.ve_tbApi.setIcon('element-editor', 'fa-edit', $rootScope.ve_tbButtons);
                cleanUpSaveAll();
            }
        };
        if ($scope.specApi.hasEdits()) {
            var instance = $uibModal.open({
                templateUrl: 'partials/mms/cancelConfirm.html',
                scope: $scope,
                controller: ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {
                    $scope.ok = function() {
                        var edit = $scope.specApi.getEdits();
                        Utils.clearAutosaveContent(edit._projectId + edit._refId + edit.id, edit.type);

                        $uibModalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $uibModalInstance.dismiss();
                    };
                }]
            });
            instance.result.then(function() {
                go();
            });
        } else
            go();
    });
    var viewSaving = false;
    $scope.$on('view-reorder-save', function() {
        if (viewSaving) {
            growl.info('Please Wait...');
            return;
        }
        viewSaving = true;
        $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save', $rootScope.ve_tbButtons);
        $scope.viewContentsOrderApi.save().then(function(data) {
            viewSaving = false;
            $scope.viewContentsOrderApi.refresh();
            growl.success('Save Succesful');
            $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save', $rootScope.ve_tbButtons);
            $rootScope.$broadcast('view.reorder.saved', $scope.viewOb.id);
        }, function(response) {
            $scope.viewContentsOrderApi.refresh();
            viewSaving = false;
            var reason = response.failedRequests[0];
            growl.error(reason.message);
            $rootScope.ve_tbApi.toggleButtonSpinner('view-reorder-save', $rootScope.ve_tbButtons);
        });
        $rootScope.ve_tbApi.select('view-reorder', $rootScope.ve_tbButtons);
    });
    $scope.$on('view-reorder-cancel', function() {
        $scope.specApi.setEditing(false);
        $scope.viewContentsOrderApi.refresh();
        $rootScope.ve_tbApi.select('element-viewer', $rootScope.ve_tbButtons);
        showPane('element');
    });
}]);
