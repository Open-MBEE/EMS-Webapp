'use strict';

/* Controllers */

angular.module('mmsApp')
.controller('MainCtrl', ['$scope', '$location', '$rootScope', '$state', '_', '$window', 'growl',
function($scope, $location, $rootScope, $state, _, $window, growl) {
    $rootScope.mms_viewContentLoading = false;
    $rootScope.mms_treeInitial = '';
    $rootScope.mms_title = '';
    $rootScope.mms_footer = 'The technical data in this document is controlled under the U.S. Export Regulations, release to foreign persons may require an export authorization.';

    var host = $location.host();
    if ($location.host().indexOf('rn-ems') !== -1) {
        // special footer for rn-ems
        $rootScope.mms_footer = 'JPL/Caltech PROPRIETARY — Not for Public Release or Redistribution. No export controlled documents allowed on this server.';
    }

    $window.addEventListener('beforeunload', function(event) {
        if ($rootScope.veEdits && !_.isEmpty($rootScope.veEdits)) {
            var message = 'You may have unsaved changes, are you sure you want to leave?';
            event.returnValue = message;
            return message;
        }
    });
    $scope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
        growl.error('Error: ' + error.message);
    });

    $rootScope.$on('$viewContentLoading', 
    function(event, viewConfig){ 
        if (viewConfig.view.controller === 'ViewCtrl')
            $rootScope.mms_viewContentLoading = true;
    });

    $rootScope.$on('$stateChangeSuccess', 
        function(event, toState, toParams, fromState, fromParams) {
        
            // set the initial tree selection
            if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
                if (toParams.tag !== undefined && toParams.tag !== 'latest')
                    $rootScope.mms_treeInitial = toParams.tag;
                else
                    $rootScope.mms_treeInitial = toParams.workspace;
            } else if ($state.current.name === 'workspace.site') {
                $rootScope.mms_treeInitial = toParams.site;
            } else if ($state.current.name === 'workspace.site.documentpreview') {
                $rootScope.mms_treeInitial = toParams.document;
            }else if ($state.includes('workspace.site.document')) {
                if (toParams.view !== undefined)
                    $rootScope.mms_treeInitial = toParams.view;
                else
                    $rootScope.mms_treeInitial = toParams.document;
            }
        }
    );
}])
.controller('ToolbarCtrl', ['$scope', '$rootScope', '$state', '$timeout', 'UxService', 'workspace', 'tag', 'document', 'time',
function($scope, $rootScope, $state, $timeout, UxService, workspace, tag, document, time) {   

    $scope.tbApi = {};
    $scope.buttons = [];
    $scope.togglePane = {};

    // TODO: Manage rootScope in controllers, for now set/get in one area of the code
    // Set MMS $rootScope variables
    $rootScope.mms_tbApi = $scope.tbApi;

    // Get MMS $rootScope variables
    $scope.togglePane = $rootScope.mms_togglePane;

    $scope.tbApi.init = function() {

      $scope.tbApi.addButton(UxService.getToolbarButton("element.viewer"));
      $scope.tbApi.addButton(UxService.getToolbarButton("element.editor"));
      if ($rootScope.veEdits && Object.keys($rootScope.veEdits).length > 0) {
          $scope.tbApi.setIcon('element.editor', 'fa-edit-asterisk');
      } 

      var editable = false;
      if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
          if (workspace === 'master' && tag.timestamp === 'latest')  // do not allow edit of master workspace
            editable = false;
          else
            editable = true;          
          $scope.tbApi.setPermission('element.editor', editable);
      } else if ($state.includes('workspace.sites') && !$state.includes('workspace.site.document')) {
          editable = document && time === 'latest';
          $scope.tbApi.setPermission('element.editor', editable);
          $scope.tbApi.addButton(UxService.getToolbarButton("tags"));
          $scope.tbApi.setPermission('tags', true);
      } else if ($state.includes('workspace.site.document')) {
          editable = document.editable && time === 'latest';
          //$scope.tbApi.addButton(UxService.getToolbarButton("view.reorder"));
          $scope.tbApi.addButton(UxService.getToolbarButton("document.snapshot"));
          $scope.tbApi.setPermission('element.editor',editable);
          //$scope.tbApi.setPermission("view.reorder", editable); 
      } else if ($state.includes('workspace.diff')) {
          $scope.tbApi.setPermission('element.editor', false);
      }
    };
}])
.controller('ViewCtrl', ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$modal', '$window', 'viewElements', 'ElementService', 'ViewService', 'ConfigService', 'time', 'growl', 'workspace', 'site', 'view', 'tag', 'snapshot', 'UxService',
function($scope, $rootScope, $state, $stateParams, $timeout, $modal, $window, viewElements, ElementService, ViewService, ConfigService, time, growl, workspace, site, view, tag, snapshot, UxService) {
    
    $scope.$on('$viewContentLoaded', 
        function(event) {
            $rootScope.mms_viewContentLoading = false; 
        }
    );

    if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
        $rootScope.mms_showSiteDocLink = true;
    } else {
        $rootScope.mms_showSiteDocLink = false;
    }

    $scope.showFilter = false;
    if ($state.current.name === 'workspace.site')
        $scope.showFilter = true;
    
    $scope.vidLink = false;
    if ($state.includes('workspace.site.documentpreview')) {
        $scope.vidLink = true;
    }

    $scope.tagId = undefined;
    if (tag.timestamp !== 'latest')
        $scope.tagId = tag.id;

    if (!$rootScope.veCommentsOn)
        $rootScope.veCommentsOn = false;
    if (!$rootScope.veElementsOn)
        $rootScope.veElementsOn = false;

    var ws = $stateParams.workspace;

    $scope.view = view;
    $scope.viewElements = viewElements;
    $scope.site = site;
    var elementSaving = false;
    $scope.bbApi = {};
    $scope.buttons = [];

    $scope.bbApi.init = function() {
        if (view && view.editable && time === 'latest') {
            $scope.bbApi.addButton(UxService.getButtonBarButton('edit.view.documentation'));
        }

        $scope.bbApi.addButton(UxService.getButtonBarButton('edit.view.documentation.save'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('edit.view.documentation.cancel'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.comments'));
        $scope.bbApi.setToggleState('show.comments', $rootScope.veCommentsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.elements'));
        $scope.bbApi.setToggleState('show.elements', $rootScope.veElementsOn);

        if ($state.includes('workspace.site.document') || $state.includes('workspace.site.documentpreview')) {
            if (snapshot !== null) {
                var pdfUrl = getPDFUrl();
                if (pdfUrl !== null && pdfUrl !== undefined) {
                    $scope.bbApi.addButton(UxService.getButtonBarButton('download.pdf'));                
                } else {
                    $scope.bbApi.addButton(UxService.getButtonBarButton('generate.pdf'));

                    var pdfStatus = getPDFStatus();
                    if (pdfStatus === 'Generating...')
                        $scope.bbApi.toggleButtonSpinner('generate.pdf');
                    else if (pdfStatus !== null)
                        $scope.bbApi.setTooltip('generate.pdf', pdfStatus);
                }

                var zipUrl = getZipUrl();
                if (zipUrl !== null && zipUrl !== undefined) {
                    $scope.bbApi.addButton(UxService.getButtonBarButton('download.zip'));                
                } else {
                    $scope.bbApi.addButton(UxService.getButtonBarButton('generate.zip'));

                    var zipStatus = getZipStatus();
                    if (zipStatus === 'Generating...')
                        $scope.bbApi.toggleButtonSpinner('generate.zip');
                    else if (zipStatus !== null)
                        $scope.bbApi.setTooltip('generate.zip', zipStatus);
                }
            }
            if ($state.includes('workspace.site.document')) {
                $scope.bbApi.addButton(UxService.getButtonBarButton('center.previous'));
                $scope.bbApi.addButton(UxService.getButtonBarButton('center.next'));
            }
        }
    };

    var getPDFStatus = function(){
        if(!snapshot) return null;
        var formats = snapshot.formats;
        if(!formats || formats.length===0) return null;
        for(var i=0; i < formats.length; i++){
            if(formats[i].type=='pdf') {
                var status = formats[i].status;
                if(status == 'Generating') status = 'Generating...';
                else if(status == 'Error') status = 'Regenerate PDF';
                return status;
            }
        }
        return null;
    };

    var getPDFUrl = function(){
        if(!snapshot) return null;
        var formats = snapshot.formats;
        if(!formats || formats.length===0) return null;
        for(var i=0; i < formats.length; i++){
            if(formats[i].type=='pdf'){
                return formats[i].url;
            }
        }
        return null;
    };

    var getZipStatus = function(){
        if(!snapshot) return null;
        var formats = snapshot.formats;
        if(!formats || formats.length===0) return null;
        for(var i=0; i < formats.length; i++){
            if(formats[i].type=='html') {
                var status = formats[i].status;
                if(status == 'Generating') status = 'Generating...';
                else if(status == 'Error') status = 'Regenerate Zip';
                return status;
            }
        }
        return null;
    };

    var getZipUrl = function(){
        if(angular.isUndefined(snapshot)) return null;
        if(snapshot===null) return null;
        
        var formats = snapshot.formats;
        if(formats===undefined || formats===null || formats.length===0) return null;
        for(var i=0; i < formats.length; i++){
            if(formats[i].type=='html'){
                return formats[i].url;  
            } 
        }
        return null;
    };

    $scope.$on('generate.pdf', function() {
        if (getPDFStatus() === 'Generating...')
            return;
        $scope.bbApi.toggleButtonSpinner('generate.pdf');
        $scope.bbApi.toggleButtonSpinner('generate.zip');

        snapshot.formats.push({"type":"pdf",  "status":"Generating"});
        snapshot.formats.push({"type":"html", "status":"Generating"});
        ConfigService.createSnapshotArtifact(snapshot, site.sysmlid, workspace).then(
            function(result){
                growl.info('Generating artifacts...Please wait for a completion email and reload the page.');
            },
            function(reason){
                growl.error('Failed to generate artifacts: ' + reason.message);
            }
        );
    });

    $scope.$on('generate.zip', function() {
        $rootScope.$broadcast('generate.pdf');        
    });

    $scope.$on('download.pdf', function() {
        $window.open(getPDFUrl());

    });

    $scope.$on('download.zip', function() {
        $window.open(getZipUrl());
    });

    $scope.$on('edit.view.documentation', function() {
        $scope.editing = !$scope.editing;
        $scope.specApi.setEditing(true);
        if ($scope.filterApi.setEditing)
            $scope.filterApi.setEditing(true);
        $scope.bbApi.setPermission('edit.view.documentation',false);
        $scope.bbApi.setPermission('edit.view.documentation.save',true);
        $scope.bbApi.setPermission('edit.view.documentation.cancel',true);
        var edit = $scope.specApi.getEdits();
        if (edit) {
            $rootScope.veEdits['element|' + edit.sysmlid + '|' + ws] = edit;
            $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit-asterisk');
            if (Object.keys($rootScope.veEdits).length > 1) {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', true);
            } else {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', false);
            }
        }
        ElementService.isCacheOutdated(view.sysmlid, ws)
        .then(function(data) {
            if (data.status && data.server.modified > data.cache.modified)
                growl.warning('This view has been updated on the server');
        });
    });

    $scope.$on('edit.view.documentation.save', function() {
        if (elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        elementSaving = true;
        $scope.bbApi.toggleButtonSpinner('edit.view.documentation.save');
        $scope.specApi.save().then(function(data) {
            if ($scope.filterApi.getEditing && $scope.filterApi.getEditing()) {
                $scope.filterApi.save().then(function(filter) {
                    $state.reload();
                }, function(reason) {
                    growl.error("Filter save error: " + reason.message);
                });
            }
            elementSaving = false;
            growl.success('Save Successful');
            $scope.editing = false;
            delete $rootScope.veEdits['element|' + $scope.specApi.getEdits().sysmlid + '|' + ws];
            if (Object.keys($rootScope.veEdits).length === 0) {
                $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit');
            }
            if (Object.keys($rootScope.veEdits).length > 1) {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', true); 
            } else {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', false);
            }
            $scope.bbApi.setPermission('edit.view.documentation',true);
            $scope.bbApi.setPermission('edit.view.documentation.save',false);
            $scope.bbApi.setPermission('edit.view.documentation.cancel',false);
        }, function(reason) {
            elementSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
        }).finally(function() {
            $scope.bbApi.toggleButtonSpinner('edit.view.documentation.save');
        });
    });

    $scope.$on('edit.view.documentation.cancel', function() {
        var go = function() {
            if ($scope.filterApi.cancel) {
                $scope.filterApi.cancel();
                $scope.filterApi.setEditing(false);
            }
            delete $rootScope.veEdits['element|' + $scope.specApi.getEdits().sysmlid + '|' + ws];
            $scope.specApi.revertEdits();
            $scope.editing = false;
            if (Object.keys($rootScope.veEdits).length === 0) {
                $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit');
            }
            if (Object.keys($rootScope.veEdits).length > 1) {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', true);
            } else {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', false);
            }
            $scope.bbApi.setPermission('edit.view.documentation',true);
            $scope.bbApi.setPermission('edit.view.documentation.save',false);
            $scope.bbApi.setPermission('edit.view.documentation.cancel',false);
        };
        if ($scope.specApi.hasEdits()) {
            var instance = $modal.open({
                templateUrl: 'partials/mms/cancelConfirm.html',
                scope: $scope,
                controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
                    $scope.ok = function() {
                        $modalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $modalInstance.dismiss();
                    };
                }]
            });
            instance.result.then(function() {
                go();
            });
        } else
            go();
    });

    $scope.$on('show.comments', function() {
        $scope.viewApi.toggleShowComments();
        $scope.bbApi.toggleButtonState('show.comments');
        $rootScope.veCommentsOn = !$rootScope.veCommentsOn;
    });

    $scope.$on('show.elements', function() {
        $scope.viewApi.toggleShowElements();
        $scope.bbApi.toggleButtonState('show.elements');
        $rootScope.veElementsOn = !$rootScope.veElementsOn;
    });

    $scope.$on('center.previous', function() {
        var prev = $rootScope.mms_treeApi.get_prev_branch($rootScope.mms_treeApi.get_selected_branch());
        if (!prev)
            return;
        $scope.bbApi.toggleButtonSpinner('center.previous');
        $rootScope.mms_treeApi.select_branch(prev);
    });

    $scope.$on('center.next', function() {
        var next = $rootScope.mms_treeApi.get_next_branch($rootScope.mms_treeApi.get_selected_branch());
        if (!next)
            return;
        $scope.bbApi.toggleButtonSpinner('center.next');
        $rootScope.mms_treeApi.select_branch(next);
    });

    if (view) {
        ViewService.setCurrentViewId(view.sysmlid);
        $rootScope.veCurrentView = view.sysmlid;
        $scope.vid = view.sysmlid;
    } else {
        $rootScope.veCurrentView = '';
        $scope.vid = '';        
    }
    $scope.ws = ws;
    $scope.version = time;
    $scope.editing = false;

    if ($state.current.name === 'workspace' && !tag.id) {
        $rootScope.$broadcast('elementSelected', ws, 'workspace');
    } else if ($state.current.name === 'workspace' && tag.id) {
        $rootScope.$broadcast('elementSelected', tag.id, 'tag');
    }
    if (view && $state.current.name !== 'workspace') {
        $timeout(function() {
            $rootScope.$broadcast('viewSelected', $scope.vid, viewElements);
        }, 225);
    }

    $scope.filterApi = {}; //for site doc filter
    $scope.viewApi = {};
    $scope.specApi = {};
    $scope.comments = {};
    $scope.numComments = 0;
    $scope.lastCommented = "";
    $scope.lastCommentedBy = "";
    $scope.tscClicked = function(elementId) {
        $rootScope.$broadcast('elementSelected', elementId, 'element');
    };
    $scope.elementTranscluded = function(element, type) {
        if (type === 'Comment' && !$scope.comments.hasOwnProperty(element.sysmlid)) {
            $scope.comments[element.sysmlid] = element;
            $scope.numComments++;
            if (element.modified > $scope.lastCommented) {
                $scope.lastCommented = element.modified;
                $scope.lastCommentedBy = element.creator;
            }
        }
    };
    $scope.viewApi.init = function() {
        if ($rootScope.veCommentsOn) {
            $scope.viewApi.toggleShowComments();
        }
        if ($rootScope.veElementsOn) {
            $scope.viewApi.toggleShowElements();
        }
    };
}])
.controller('ToolCtrl', ['$scope', '$rootScope', '$state', '$modal', '$q', '$stateParams',
            'ConfigService', 'ElementService', 'WorkspaceService', 'growl', 
            'workspaceObj', 'tags', 'tag', 'snapshots', 'site', 'document', 'time',
function($scope, $rootScope, $state, $modal, $q, $stateParams, ConfigService, ElementService, WorkspaceService, growl, workspaceObj, tags, tag, snapshots, site, document, time) {

    // TODO rename variable ws
    var ws = $stateParams.workspace;
    $scope.specWs = ws;
    $scope.document = document;
    $scope.ws = ws;
    $scope.editable = document && document.editable && time === 'latest';
    $scope.snapshots = snapshots;
    $scope.tags = tags;
    $scope.site = site;
    $scope.version = time;

    if (document)
        $scope.eid = $scope.document.sysmlid;
    else
        $scope.eid = null;

    $scope.vid = $scope.eid;
    $scope.specApi = {};
    $scope.viewOrderApi = {};
    $rootScope.mms_togglePane = $scope.$pane;

    $scope.show = {
        element: true,
        reorder: false,
        snapshots: false,
        tags: false
    };
    $scope.tracker = {};
    if (!$rootScope.veEdits)
        $rootScope.veEdits = {};

    // TODO: for editing of workspace/tag elements
    if ($state.current.name === 'workspace') {
        if (tag.name !== 'latest') {
            $scope.document = tag;
            $scope.eid = tag.id;
        }
        else {
            $scope.document = workspaceObj;
            $scope.eid = workspaceObj.id;            
        }
    }

    $scope.snapshotClicked = function() {
        $scope.snapshotLoading = 'fa fa-spinner fa-spin';
    };

    $scope.etrackerChange = function() {
        $scope.specApi.keepMode();
        var id = $scope.tracker.etrackerSelected;
        var info = id.split('|');
        if (info[0] === 'element') {
            $scope.eid = info[1];
            $scope.elementType = 'element';
            $scope.specWs = info[2];
        } else if (info[0] === 'workspace') {
            $scope.eid = info[1];
            $scope.elementType = 'workspace';
            $scope.specWs = info[1];
        } else if (info[0] === 'tag') {
            $scope.eid = info[1];
            $scope.elementType = 'tag';
            $scope.specWs = info[2];
        }
    };

    $scope.showTracker = function() {
        /*if (time !== 'latest')
            return false;*/
        return true;
        /* if (Object.keys($rootScope.veEdits).length > 1 && $scope.specApi.getEditing())
            return true;
        return false; */
    };

    var showPane = function(pane) {
        angular.forEach($scope.show, function(value, key) {
            if (key === pane)
                $scope.show[key] = true;
            else
                $scope.show[key] = false;
        });
    };

    var refreshSnapshots = function() {
        $rootScope.mms_tbApi.toggleButtonSpinner('document.snapshot.refresh');
        ConfigService.getProductSnapshots($scope.document.sysmlid, $scope.site.name, $scope.ws, true)
        .then(function(result) {
            $scope.snapshots = result;
        }, function(reason) {
            growl.error("Refresh Failed: " + reason.message);
        })
        .finally(function() {
            $rootScope.mms_tbApi.toggleButtonSpinner('document.snapshot.refresh');
            $rootScope.mms_tbApi.select('document.snapshot');

        });
    };

    var creatingSnapshot = false;
    $scope.$on('document.snapshot.create', function() {
        if (creatingSnapshot) {
            growl.info('Please Wait...');
            return;
        }
        creatingSnapshot = true;
        $rootScope.mms_tbApi.toggleButtonSpinner('document.snapshot.create');
        ConfigService.createSnapshot($scope.document.sysmlid, site.name, ws)
        .then(function(result) {
            creatingSnapshot = false;
            $rootScope.mms_tbApi.toggleButtonSpinner('document.snapshot.create');
            growl.success("Snapshot Created: Refreshing...");
            refreshSnapshots();
        }, function(reason) {
            creatingSnapshot = false;
            growl.error("Snapshot Creation failed: " + reason.message);
            $rootScope.mms_tbApi.toggleButtonSpinner('document.snapshot.create');
        });
        $rootScope.mms_tbApi.select('document.snapshot');
    });

    $scope.$on('document.snapshot.refresh', refreshSnapshots);

    $scope.$on('document.snapshot', function() {
        showPane('snapshots');
    });

    $scope.$on('tags', function() {
        showPane('tags');
    });

    $scope.$on('elementSelected', function(event, eid, type) {
        $scope.elementType = type;
        $scope.eid = eid;
        $rootScope.mms_tbApi.select('element.viewer');
        if ($rootScope.togglePane && $rootScope.togglePane.closed)
            $rootScope.togglePane.toggle();

        showPane('element');
        if ($scope.specApi.setEditing)
            $scope.specApi.setEditing(false);
        if (type !== 'element') {
            if (type === 'workspace' && eid === 'master')
                $rootScope.mms_tbApi.setPermission('element.editor', false);
            else
                $rootScope.mms_tbApi.setPermission('element.editor', true);
        }
        if (type === 'element') {
            ElementService.getElement(eid, false, ws, time).
            then(function(element) {
                var editable = element.editable && time === 'latest';
                $rootScope.mms_tbApi.setPermission('element.editor', editable);
                $rootScope.mms_tbApi.setPermission("document.snapshot.create", editable);
            });
        }
    });
    $scope.$on('element.viewer', function() {
        $scope.specApi.setEditing(false);
        showPane('element');
    });
    $scope.$on('element.editor', function() {
        $scope.specApi.setEditing(true);
        showPane('element');
        var edit = $scope.specApi.getEdits();
        if (edit) {
            $scope.tracker.etrackerSelected = $scope.elementType + '|' + (edit.sysmlid || edit.id) + '|' + $scope.specWs;
            $rootScope.veEdits[$scope.elementType + '|' + (edit.sysmlid || edit.id) + '|' + $scope.specWs] = edit;
            $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit-asterisk');
            if (Object.keys($rootScope.veEdits).length > 1) {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', true);
            } else {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', false);
            }
        }
        if ($scope.elementType !== 'element')
            return;
        ElementService.isCacheOutdated($scope.eid, $scope.specWs)
        .then(function(data) {
            if (data.status && data.server.modified > data.cache.modified)
                growl.error('This element has been updated on the server. Please refresh the page to get the latest version.');
        });
    });
    $scope.$on('viewSelected', function(event, vid, viewElements) {
        $scope.eid = vid;
        $scope.vid = vid;
        $scope.viewElements = viewElements;
        $scope.elementType = 'element';
        $scope.specWs = ws;
        $rootScope.mms_tbApi.select('element.viewer');
        showPane('element');
        ElementService.getElement(vid, false, ws, time).
        then(function(element) {
            var editable = element.editable && time === 'latest';
            $rootScope.mms_tbApi.setPermission('element.editor', editable);
            $rootScope.mms_tbApi.setPermission('view.reorder', editable);
            $rootScope.mms_tbApi.setPermission("document.snapshot.create", editable);
        });
        $scope.specApi.setEditing(false);
    });
    $scope.$on('view.reorder', function() {
        $scope.viewOrderApi.setEditing(true);
        showPane('reorder');
    });
    
    var elementSaving = false;
    $scope.$on('element.editor.save', function() {
        if (elementSaving) {
            growl.info('Please Wait...');
            return;
        }
        elementSaving = true;
        $rootScope.mms_tbApi.toggleButtonSpinner('element.editor.save');
        $scope.specApi.save().then(function(data) {
            elementSaving = false;
            growl.success('Save Successful');
            $rootScope.mms_tbApi.toggleButtonSpinner('element.editor.save');
            var edit = $scope.specApi.getEdits();
            delete $rootScope.veEdits[$scope.elementType + '|' + (edit.sysmlid || edit.id ) + '|' + $scope.specWs];
            if (Object.keys($rootScope.veEdits).length > 0) {
                var next = Object.keys($rootScope.veEdits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.eid = id[1];
                $scope.specWs = id[2];
                $scope.elementType = id[0];
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.mms_tbApi.select('element.viewer');
                if (Object.keys($rootScope.veEdits).length === 0) {
                    $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit');
                }
            }
        }, function(reason) {
            elementSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
            $rootScope.mms_tbApi.toggleButtonSpinner('element.editor.save');
        });

        $rootScope.mms_tbApi.select('element.editor');
    });

    var savingAll = false;
    $scope.$on('element.editor.saveall', function() {
        if (savingAll) {
            growl.info('Please wait...');
            return;
        }
        if (Object.keys($rootScope.veEdits).length === 0) {
            growl.info('Nothing to save');
            return;
        }
        if ($scope.specApi && $scope.specApi.tinymceSave)
            $scope.specApi.tinymceSave();
        savingAll = true;
        $rootScope.mms_tbApi.toggleButtonSpinner('element.editor.saveall');
        var promises = [];
        angular.forEach($rootScope.veEdits, function(value, key) {
            var defer = $q.defer();
            promises.push(defer.promise);
            var keys = key.split('|');
            var elementWs = keys[2];
            var elementType = keys[0];
            if (elementType === 'element') {
                ElementService.updateElement(value, elementWs)
                .then(function(e) {
                    defer.resolve({status: 200, id: e.sysmlid, type: elementType, ws: elementWs});
                }, function(reason) {
                    defer.resolve({status: reason.status, id: value.sysmlid});
                });
            } else if (elementType === 'tag') {
                ConfigService.update(value, elementWs)
                .then(function(e) {
                    defer.resolve({status: 200, id: e.id, type: elementType, ws: elementWs});
                }, function(reason) {
                    defer.resolve({status: reason.status, id: value.id});
                });
            } else if (elementType === 'workspace') {
                WorkspaceService.update(value)
                .then(function(e) {
                    defer.resolve({status: 200, id: e.id, type: elementType, ws: elementWs});
                }, function(reason) {
                    defer.resolve({status: reason.status, id: value.id});
                });
            }
        });
        $q.all(promises).then(function(results) {
            var somefail = false;
            var failedId = null;
            var failedType = 'element';
            var failedWs = 'master';
            results.forEach(function(ob) {
                if (ob.status === 200)
                    delete $rootScope.veEdits[ob.type + '|' + ob.id + '|' + ob.ws];
                else {
                    somefail = true;
                    failedId = ob.id;
                    failedType = ob.type;
                    failedWs = ob.ws;
                }
            });
            if (!somefail) {
                growl.success("Save All Successful");
                $rootScope.mms_tbApi.select('element.viewer');
                $scope.specApi.setEditing(false);
            } else {
                $scope.tracker.etrackerSelected = failedType + '|' + failedId + '|' + failedWs;
                $scope.specApi.keepMode();
                $scope.eid = failedId;
                $scope.specWs = failedWs;
                $scope.elementType = failedType;
                growl.error("Some elements failed to save, resolve individually in edit pane");
            }
            $rootScope.mms_tbApi.toggleButtonSpinner('element.editor.saveall');
            savingAll = false;

            if (Object.keys($rootScope.veEdits).length === 0) {
                $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit');
            }
        });
    });
    $scope.$on('element.editor.cancel', function() {
        var go = function() {
            var edit = $scope.specApi.getEdits();
            delete $rootScope.veEdits[$scope.elementType + '|' + (edit.sysmlid || edit.id) + '|' + $scope.specWs];
            $scope.specApi.revertEdits();
            if (Object.keys($rootScope.veEdits).length > 0) {
                var next = Object.keys($rootScope.veEdits)[0];
                var id = next.split('|');
                $scope.tracker.etrackerSelected = next;
                $scope.specApi.keepMode();
                $scope.eid = id[1];
                $scope.specWs = id[2];
                $scope.elementType = id[0];
            } else {
                $scope.specApi.setEditing(false);
                $rootScope.mms_tbApi.select('element.viewer');
                $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit');
            }
        };
        if ($scope.specApi.hasEdits()) {
            var instance = $modal.open({
                templateUrl: 'partials/mms/cancelConfirm.html',
                scope: $scope,
                controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
                    $scope.ok = function() {
                        $modalInstance.close('ok');
                    };
                    $scope.cancel = function() {
                        $modalInstance.dismiss();
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
    $scope.$on('view.reorder.save', function() {
        if (viewSaving) {
            growl.info('Please Wait...');
            return;
        }
        viewSaving = true;
        $rootScope.mms_tbApi.toggleButtonSpinner('view.reorder.save');
        $scope.viewOrderApi.save().then(function(data) {
            viewSaving = false;
            growl.success('Save Succesful');
            $rootScope.mms_tbApi.toggleButtonSpinner('view.reorder.save');
        }, function(reason) {
            viewSaving = false;
            if (reason.type === 'info')
                growl.info(reason.message);
            else if (reason.type === 'warning')
                growl.warning(reason.message);
            else if (reason.type === 'error')
                growl.error(reason.message);
            $rootScope.mms_tbApi.toggleButtonSpinner('view.reorder.save');
        });
        $rootScope.mms_tbApi.select('view.reorder');
    });
    $scope.$on('view.reorder.cancel', function() {
        $scope.specApi.setEditing(false);
        $scope.viewOrderApi.revertEdits();
        $rootScope.mms_tbApi.select('element.viewer');
        showPane('element');
    });
}])
.controller('TreeCtrl', ['$anchorScroll' , '$q', '$filter', '$location', '$modal', '$scope', '$rootScope', '$state', '$stateParams', '$timeout', 'growl', 
                          'UxService', 'ConfigService', 'ElementService', 'UtilsService', 'WorkspaceService', 'ViewService',
                          'workspaces', 'workspaceObj', 'tag', 'sites', 'site', 'document', 'views', 'view', 'time', 'configSnapshots',
function($anchorScroll, $q, $filter, $location, $modal, $scope, $rootScope, $state, $stateParams, $timeout, growl, UxService, ConfigService, ElementService, UtilsService, WorkspaceService, ViewService, workspaces, workspaceObj, tag, sites, site, document, views, view, time, configSnapshots) {

    $rootScope.mms_bbApi = $scope.bbApi = {};
    $rootScope.mms_treeApi = $scope.treeApi = {};
    $scope.buttons = [];

    $scope.treeSectionNumbering = false;
    if ($state.includes('workspace.site.document')) {
        $scope.treeSectionNumbering = true;
    }
    $rootScope.mms_fullDocMode = false;
    if ($state.includes('workspace.site.document.full'))
        $rootScope.mms_fullDocMode = true;

    // TODO: pull in config/tags
    var config = time;
    var ws = $stateParams.workspace; // TODO this is undefined, but is being used below

    if (document !== null) {
        $scope.document = document;
        $scope.editable = $scope.document.editable && time === 'latest' && $scope.document.specialization.type === 'Product';
    }

    // If it is not the master workspace, then retrieve it:
    if (workspaceObj.id !== 'master') {
        WorkspaceService.getWorkspace('master').then(function (data) {
            $scope.wsPerms = data.workspaceOperationsPermission;
        });
    }
    else {
        $scope.wsPerms = workspaceObj.workspaceOperationsPermission;
    }

    $scope.bbApi.init = function() {
      $scope.bbApi.addButton(UxService.getButtonBarButton("tree.expand"));
      $scope.bbApi.addButton(UxService.getButtonBarButton("tree.collapse"));
      $scope.bbApi.addButton(UxService.getButtonBarButton("tree.filter"));

      if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.add.task"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.add.configuration"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.delete"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.merge"));
        $scope.bbApi.setPermission("tree.add.task", $scope.wsPerms);
        $scope.bbApi.setPermission("tree.delete", $scope.wsPerms);
        $scope.bbApi.setPermission("tree.merge", $scope.wsPerms);
      } else if ($state.includes('workspace.sites') && !$state.includes('workspace.site.document')) {
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.add.document"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.showall.sites"));
        $scope.bbApi.setPermission("tree.add.document", config == 'latest' ? true : false);
      } else if ($state.includes('workspace.site.document')) {
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.add.view"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.delete.view"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.reorder.view"));
        $scope.bbApi.addButton(UxService.getButtonBarButton("tree.full.document"));
        $scope.bbApi.setPermission("tree.add.view", $scope.editable);
        $scope.bbApi.setPermission("tree.reorder.view", $scope.editable);
        $scope.bbApi.setPermission("tree.delete.view", $scope.editable);
        if ($rootScope.mms_fullDocMode)
            $scope.bbApi.setToggleState('tree.full.document', true);
      }
    };

    $scope.$on('tree.expand', function() {
        $scope.treeApi.expand_all();
    });

    $scope.$on('tree.collapse', function() {
        $scope.treeApi.collapse_all();
    });

    $scope.$on('tree.filter', function() {
        $scope.toggleFilter();
    });

    $scope.$on('tree.showall.sites', function() {
        $scope.toggleShowAllSites();
    });

    $scope.$on('tree.add.task', function() {
        $scope.addItem('Workspace');
    });

    $scope.$on('tree.add.configuration', function() {
        $scope.addItem('Tag');
    });

    $scope.$on('tree.add.document', function() {
        $scope.addItem('Document');
    });

    $scope.$on('tree.add.view', function() {
        $scope.addItem('View');
    });

    $scope.$on('tree.delete', function() {
        $scope.deleteItem();
    });

    $scope.$on('tree.delete.view', function() {
        $scope.deleteItem();
    });

    $scope.$on('tree.merge', function() {
        $scope.toggleMerge();
    });

    $scope.$on('tree.reorder.view', function() {
        $rootScope.mms_fullDocMode = false;
        $scope.bbApi.setToggleState("tree.full.document", false);
        $state.go('workspace.site.document.order');
    });

    $scope.$on('tree.full.document', function() {
        $scope.fullDocMode();
    });

    $scope.toggleFilter = function() {
        $scope.bbApi.toggleButtonState('tree.filter');
    };

    $scope.toggleShowAllSites = function() {
        $scope.bbApi.toggleButtonState('tree.showall.sites');
        $scope.my_data = UtilsService.buildTreeHierarchy(filter_sites(sites), "sysmlid", "site", "parent", siteLevel2Func);
        $scope.mms_treeApi.clear_selected_branch();
    };

    // TODO: Move toggle to button bar api
    $scope.mergeOn = false;
    $scope.toggleMerge = function() {
        var branch = $scope.mms_treeApi.get_selected_branch();
        if (!branch) {
            growl.warning("Compare Error: Select task or tag to compare from");
            return;
        }
        var parent_branch = $scope.mms_treeApi.get_parent_branch(branch);
        while (parent_branch.type != 'workspace') {
            parent_branch = $scope.mms_treeApi.get_parent_branch(parent_branch);
        }

        $scope.mergeOn = !$scope.mergeOn;
        $scope.mergeFrom = branch;
        $scope.mergeTo = parent_branch;
    };

    $scope.pickNew = function(source, branch) {
        if (!branch) {
            growl.warning("Select new task or tag to compare");
            return;
        }
        if (source == 'from')
            $scope.mergeFrom = branch;
        if (source == 'to')
            $scope.mergeTo = branch;
    };

    // TODO: Move toggle to button bar api
    $scope.comparing = false;
    $scope.compare = function() {
        if ($scope.comparing) {
            growl.info("Please wait...");
            return;
        }
        if (!$scope.mergeFrom || !$scope.mergeTo) {
            growl.warning("From and To fields must be filled in");
            return;
        }
        var sourceWs = $scope.mergeFrom.data.id;
        var sourceTime = 'latest';
        if ($scope.mergeFrom.type === 'configuration') {
            sourceWs = $scope.mergeFrom.workspace;
            sourceTime = $scope.mergeFrom.data.timestamp;
        }
        var targetWs = $scope.mergeTo.data.id;
        var targetTime = 'latest';
        if ($scope.mergeTo.type === 'configuration') {
            targetWs = $scope.mergeTo.workspace;
            targetTime = $scope.mergeTo.data.timestamp;
        }
        $scope.comparing = true;
        $state.go('workspace.diff', {source: sourceWs, target: targetWs, sourceTime: sourceTime, targetTime: targetTime});
    };

    // Filter out alfresco sites
    var filter_sites = function(site_array) {
        var ret_array = [];

        if ($scope.bbApi.getToggleState && $scope.bbApi.getToggleState('tree.showall.sites')) {
            ret_array = site_array;
        }
        else {
            for (var i=0; i < site_array.length; i++) {
                var obj = site_array[i];
                // If it is a site characterization:
                if (obj.isCharacterization) {
                    ret_array.push(obj);
                }
            }
        }
        return ret_array;
    };
 
    // TODO: Make this section generic
    var workspaceLevel2Func = function(workspaceId, workspaceTreeNode) {
        ConfigService.getConfigs(workspaceId).then (function (data) {
            data.forEach(function (config) {
                var configTreeNode = { 
                    label : config.name, 
                    type : "configuration",
                    data : config, 
                    workspace: workspaceId,
                    children : [] 
                };

                // check all the children of the workspace to see if any tasks match the timestamp of the config
                // if so add the workspace as a child of the configiration it was tasked from
                for (var i = 0; i < workspaceTreeNode.children.length; i++) {
                    var childWorkspaceTreeNode = workspaceTreeNode.children[i];
                    if (childWorkspaceTreeNode.type === 'workspace') {
                        if (childWorkspaceTreeNode.data.branched === config.timestamp) {
                            configTreeNode.children.push(childWorkspaceTreeNode);
                            
                            workspaceTreeNode.children.splice(i, 1);
                            i--;
                        }
                    }
                }

                workspaceTreeNode.children.unshift(configTreeNode); 
            });
            if ($scope.treeApi.refresh)
                $scope.treeApi.refresh();
        }, function(reason) {
            growl.error(reason.message);
        });
    };

    var siteLevel2Func = function(site, siteNode) {
        ViewService.getSiteDocuments(site, false, ws, config === 'latest' ? 'latest' : tag.timestamp)
        .then(function(docs) {
            var filteredDocs = {};
            var siteDocsViewId = site + '_filtered_docs';
            var deferred = $q.defer();

            ElementService.getElement(siteDocsViewId, false, ws, config === 'latest' ? 'latest' : tag.timestamp)
            .then(function(filter) {
                filteredDocs = JSON.parse(filter.documentation);
                deferred.resolve('ok');
            }, function(reason) {
                deferred.resolve('ok');
            });
            deferred.promise.then(function() {
                if (config === 'latest') {
                    docs.forEach(function(doc) {
                        if (filteredDocs[doc.sysmlid])
                            return;
                        var docNode = {
                            label : doc.name,
                            type : 'view',
                            data : doc,
                            site : site,
                            children : []
                        };
                        siteNode.children.unshift(docNode);
                    });
                } else {
                    var docids = [];
                    docs.forEach(function(doc) {
                        if (filteredDocs[doc.sysmlid])
                            return;
                        docids.push(doc.sysmlid);
                    });
                    configSnapshots.forEach(function(snapshot) {
                        if (docids.indexOf(snapshot.sysmlid) > -1) {
                            snapshot.name = snapshot.sysmlname;
                            var snapshotNode = {
                                label : snapshot.sysmlname,
                                type : 'snapshot',
                                data : snapshot,
                                site : site,
                                children : []
                            };
                            siteNode.children.unshift(snapshotNode);
                        }
                    });
                }
                if ($scope.treeApi.refresh)
                    $scope.treeApi.refresh();
            });
        }, function(reason) {
            growl.error(reason.message);
        });
    };

    if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
        $scope.my_data = UtilsService.buildTreeHierarchy(workspaces, "id", 
                                                         "workspace", "parent", workspaceLevel2Func);
    } else if ($state.includes('workspace.sites') && !$state.includes('workspace.site.document')) {
        $scope.my_data = UtilsService.buildTreeHierarchy(filter_sites(sites), "sysmlid", "site", "parent", siteLevel2Func);
    } else
    {
        // this is from view editor
        var viewId2node = {};
        viewId2node[document.sysmlid] = {
            label: document.name,
            type: 'view',
            data: document,
            children: []
        };
        views.forEach(function(view) {
            var viewTreeNode = { 
                label : view.name, 
                type : "view",
                data : view, 
                children : [] 
            };
            viewId2node[view.sysmlid] = viewTreeNode;
            //addSectionElements(elements[i], viewTreeNode, viewTreeNode);
        });

        var seenChild = {};
        if (!document.specialization.view2view) {
            document.specialization.view2view = [{id: document.sysmlid, childrenViews: []}];
        }
        document.specialization.view2view.forEach(function(view) {
            var viewid = view.id;
            view.childrenViews.forEach(function(childId) {
                if (seenChild[childId]) {
                    growl.error("You have a view called " + seenChild[childId].label + " that's a child of multiple parents! Please fix in the model.");
                    return;
                }
                viewId2node[viewid].children.push(viewId2node[childId]);
                seenChild[childId] = viewId2node[childId];
            });
        });
        $scope.my_data = [viewId2node[document.sysmlid]];
    }

    function addSectionElements(element, viewNode, parentNode) {
        var contains = null;
        if (element.specialization)
            contains = element.specialization.contains;
        else
            contains = element.contains;
        var j = contains.length - 1;
        for (; j >= 0; j--) {
            var containedElement = contains[j];
            if (containedElement.type === "Section") {
                var sectionTreeNode = { 
                    label : containedElement.name, 
                    type : "section",
                    view : viewNode.data.sysmlid,
                    data : containedElement, 
                    children : [] 
                };
                parentNode.children.unshift(sectionTreeNode);
                addSectionElements(containedElement, viewNode, sectionTreeNode);
            }
        }
    }
    // TODO: Update behavior to handle new state descriptions
    $scope.my_tree_handler = function(branch) {
        if ($state.includes('workspaces') && !$state.includes('workspace.sites')) {
            if (branch.type === 'workspace') {
                $state.go('workspace', {workspace: branch.data.id, tag: undefined});
            } else if (branch.type === 'configuration') {
                //$rootScope.$broadcast('elementSelected', branch.data.id, 'tag');
                $state.go('workspace', {workspace: branch.workspace, tag: branch.data.id});
            }
        } else if ($state.includes('workspace.sites') && !$state.includes('workspace.site.document')) {
            if (branch.type === 'site')
                $state.go('workspace.site', {site: branch.data.sysmlid});
            else if (branch.type === 'view' || branch.type === 'snapshot') {
                var documentSiteBranch = $rootScope.mms_treeApi.get_parent_branch(branch);
                $state.go('workspace.site.documentpreview', {site: documentSiteBranch.data.sysmlid, document: branch.data.sysmlid});
            }
        } else if ($state.includes('workspace.site.document')) {

            var view = branch.type === 'section' ? branch.view : branch.data.sysmlid;
            if ($rootScope.mms_fullDocMode) {
                $location.hash(view);
                $rootScope.veCurrentView = view;
                ViewService.setCurrentViewId(view);
                $anchorScroll();
            } else if (branch.type === 'view') {
                $state.go('workspace.site.document.view', {view: branch.data.sysmlid});
            } 
        }
        $rootScope.mms_tbApi.select('element.viewer');
    };

    // TODO: Update sort function to handle all cases
    var sortFunction = function(a, b) {

        a.priority = 100;
        if (a.type === 'configuration') {
            a.priority = 0 ;
        } else if (a.type === 'site') {
            a.priority = 1;
        }
         else if (a.type === 'view') {
            a.priority = 2;
        }

        b.priority = 100;
        if (b.type === 'configuration') {
            b.priority = 0 ;
        } else if (b.type === 'site') {
            b.priority = 1;
        }
         else if (b.type === 'view') {
            b.priority = 2;
        }

        if(a.priority < b.priority) return -1;
        if(a.priority > b.priority) return 1;
        if (!a.label)
            a.label = '';
        if (!b.label)
            b.label = '';
        if(a.label.toLowerCase() < b.label.toLowerCase()) return -1;
        if(a.label.toLowerCase() > b.label.toLowerCase()) return 1;

        return 0;
    };

    // TODO: update tree options to call from UxService
    $scope.tree_options = {
        types: UxService.getTreeTypes()
    };
    if (!$state.includes('workspace.site.document'))
        $scope.tree_options.sort = sortFunction;
    
    // TODO: this is a hack, need to resolve in alternate way    
    $timeout(function() {
        $scope.treeApi.refresh();
    }, 5000);
    

    $scope.addItem = function(itemType) {

        // TODO: combine templateUrlStr into one .html

        $scope.itemType = itemType;
        var branch = $scope.treeApi.get_selected_branch();
        var templateUrlStr = "";
        var branchType = "";

        // Adds the branch:
        var myAddBranch = function() {
            var instance = $modal.open({
                templateUrl: templateUrlStr,
                scope: $scope,
                controller: ['$scope', '$modalInstance', '$filter', addItemCtrl]
            });
            instance.result.then(function(data) {
                var newbranch = {
                    label: data.name,
                    type: branchType,
                    data: data,
                    children: [],
                };
                
                var top = false;
                if (itemType === 'Tag') {
                    newbranch.workspace = branch.data.id;
                    top = true;
                }
                else if (itemType === 'Document') {
                    newbranch.site = branch.data.sysmlid;
                }

                $scope.treeApi.add_branch(branch, newbranch, top);

                if (itemType === 'View') {
                    $state.go('workspace.site.document.view', {view: data.sysmlid});
                }

            });
        };

        // Item specific setup:
        if (itemType === 'Workspace') {
            if (!branch) {
                growl.warning("Add Task Error: Select a task or tag first");
                return;
            }
            if (branch.type === 'configuration') {
                $scope.createWsParentId = branch.workspace;
                $scope.createWsTime = branch.data.timestamp;
                $scope.from = 'Tag ' + branch.data.name;
            } else {
                $scope.createWsParentId = branch.data.id;
                $scope.createWsTime = $filter('date')(new Date(), 'yyyy-MM-ddTHH:mm:ss.sssZ');
                $scope.from = 'Task ' + branch.data.name;
            }
            templateUrlStr = 'partials/mms/new-task.html';
            branchType = 'workspace';
        }
        else if (itemType === 'Tag') {
            if (!branch) {
                growl.warning("Add Tag Error: Select parent task first");
                return;
            } else if (branch.type != "workspace") {
                growl.warning("Add Tag Error: Selection must be a task");
                return;
            }
            $scope.createConfigParentId = branch.data.id;
            $scope.configuration = {};
            $scope.configuration.now = true;
            templateUrlStr = 'partials/mms/new-tag.html';
            branchType = 'configuration';
        } 
        else if (itemType === 'Document') {
            if (!branch || branch.type !== 'site') {
                growl.warning("Select a site to add document under");
                return;
            }
            $scope.addDocSite = branch.data.sysmlid;
            templateUrlStr = 'partials/mms/new-doc.html';
            branchType = 'view';
        } 
        else if (itemType === 'View') {
            if (!branch) {
                growl.warning("Add View Error: Select parent view first");
                return;
            } else if (branch.type === "section") {
                growl.warning("Add View Error: Cannot add a child view to a section");
                return;
            }
            templateUrlStr = 'partials/mms/new-view.html';
            branchType = 'view';

            ElementService.isCacheOutdated(document.sysmlid, ws)
            .then(function(status) {
                if (status.status) {
                    if (!angular.equals(document.specialization.view2view, status.server.specialization.view2view)) {
                        growl.error('The document hierarchy is outdated, refresh the page first!');
                        return;
                    } 
                } 
                $scope.createViewParentId = branch.data.sysmlid;
                $scope.newView = {};
                $scope.newView.name = "";

                myAddBranch();

            }, function(reason) {
                growl.error('Checking if document hierarchy is up to date failed: ' + reason.message);
            });
        } 
        else {
            growl.error("Add Item of Type " + itemType + " is not supported");
        }

        if (itemType !== 'View') {
            myAddBranch();
        }
    };

    $scope.fullDocMode = function() {
        if ($rootScope.mms_fullDocMode) {
            $rootScope.mms_fullDocMode = false;
            $scope.bbApi.setToggleState("tree.full.document", false);
            var curBranch = $scope.treeApi.get_selected_branch();
            if (curBranch) {
                var viewId;
                if (curBranch.type == 'section')
                    viewId = curBranch.view;
                else
                    viewId = curBranch.data.sysmlid;
                $state.go('workspace.site.document.view', {view: viewId});
            }
        } else {
            if ($state.current.name === 'doc.all') {
                $rootScope.mms_fullDocMode = true;
                $scope.bbApi.setToggleState("tree.full.document", true);
            } else {
                if (document.specialization.view2view.length > 30) {
                    var instance = $modal.open({
                        templateUrl: 'partials/mms/fullDocWarn.html',
                        controller: ['$scope', '$modalInstance', function($scope, $modalInstance) {
                            $scope.ok = function() {$modalInstance.close('ok');};
                            $scope.cancel = function() {$modalInstance.close('cancel');};
                        }],
                        size: 'sm'
                    });
                    instance.result.then(function(choice) {
                        if (choice === 'ok') {
                            $rootScope.mms_fullDocMode = true;
                            $scope.bbApi.setToggleState("tree.full.document", true);
                            $state.go('workspace.site.document.full'); 
                        }
                    });
                } else {
                    $rootScope.mms_fullDocMode = true;
                    $scope.bbApi.setToggleState("tree.full.document", true);
                    $state.go('workspace.site.document.full'); 
                }
            }
        }
    };

    $scope.deleteItem = function() {
        var branch = $scope.treeApi.get_selected_branch();
        if (!branch) {
            growl.warning("Delete Error: Select item to delete.");
            return;
        }
        if ($state.includes('workspace.site.document') && 
            (branch.type !== 'view' || (branch.data.specialization && branch.data.specialization.type != 'View'))) {
            growl.warning("Delete Error: Selected item is not a view.");
            return;
        }
        // TODO: do not pass selected branch in scope, move page to generic location
        $scope.deleteBranch = branch;
        var instance = $modal.open({
            templateUrl: 'partials/mms/delete.html',
            scope: $scope,
            controller: ['$scope', '$modalInstance', deleteCtrl]
        });
        instance.result.then(function(data) {
            // If the deleted item is a configration, then all of its child workspaces
            // are re-associated with the parent task of the configuration
            if (branch.type === 'configuration') {
                var parentWsBranch = $scope.treeApi.get_parent_branch(branch);
                branch.children.forEach(function(branchChild) {
                    parentWsBranch.children.push(branchChild);
                });
            }
            $scope.treeApi.remove_branch(branch);
            $state.go('^');
        });
    };

    // TODO: Make this a generic delete controller
    var deleteCtrl = function($scope, $modalInstance) {
        $scope.oking = false;
        var branch = $scope.deleteBranch;
        if (branch.type === 'workspace')
            $scope.type = 'Task';
        if (branch.type === 'configuration')
            $scope.type = 'Tag';
        if (branch.type === 'view')
            $scope.type = 'View';
        //$scope.type = branch.type === 'workspace' ? 'task' : 'tag';
        $scope.name = branch.data.name;
        $scope.ok = function() {
            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;
            var promise = null;
            if (branch.type === "workspace") {
                promise = WorkspaceService.deleteWorkspace(branch.data.id);
            } else if (branch.type === "configuration") {
                promise = ConfigService.deleteConfig(branch.data.id);
            } else if (branch.type === 'view') {
                var product = $scope.document;
                for (var i = 0; i < product.specialization.view2view.length; i++) {
                    var view = product.specialization.view2view[i];
                    if (branch.data.sysmlid === view.id ) {
                    // remove 
                        product.specialization.view2view.splice(i,1);
                        i--;
                    }
                    for (var j = 0; j < view.childrenViews.length; j++) {
                        var childViewId = view.childrenViews[j];
                        if (branch.data.sysmlid === childViewId) {
                        // remove child view
                            view.childrenViews.splice(j,1);
                            j--;
                        }
                    }
                }
                promise = ViewService.updateDocument(product, ws);
            }
            promise.then(function(data) {
                growl.success($scope.type + " Deleted");
                $modalInstance.close('ok');
            }, function(reason) {
                growl.error($scope.type + ' Delete Error: ' + reason.message);
            }).finally(function() {
                $scope.oking = false;
            });
        };
        $scope.cancel = function() {
            $modalInstance.dismiss();
        };
    };

    // Generic add controller    
    var addItemCtrl = function($scope, $modalInstance, $filter) {

        $scope.oking = false;
        var displayName = "";

        // Item specific setup:
        if ($scope.itemType === 'Workspace') {
            $scope.workspace = {};
            $scope.workspace.name = "";
            $scope.workspace.description = "";
            $scope.workspace.permission = "read";
            displayName = "Task";
        }
        else if ($scope.itemType === 'Tag') {
            $scope.configuration = {};
            $scope.configuration.name = "";
            $scope.configuration.description = "";
            $scope.configuration.now = "true";
            $scope.configuration.timestamp = new Date();
            displayName = "Tag";
        }
        else if ($scope.itemType === 'Document') {
            $scope.doc = {name: ""};
            displayName = "Document";
        }
        else if ($scope.itemType === 'View') {
            $scope.newView = {};
            $scope.newView.name = "";
            displayName = "View";
        }
        else {
            growl.error("Add Item of Type " + $scope.itemType + " is not supported");
            return;
        }
        $scope.searching = false;
        $scope.search = function(searchText) {
            //var searchText = $scope.searchText; //TODO investigate why searchText isn't in $scope
            //growl.info("Searching...");
            $scope.searching = true;

            ElementService.search(searchText, false, ws)
            .then(function(data) {

                for (var i = 0; i < data.length; i++) {
                    if (data[i].specialization.type != 'View') {
                        data.splice(i, 1);
                        i--;
                    }
                }

                $scope.mmsCfElements = data;
                $scope.searching = false;
            }, function(reason) {
                growl.error("Search Error: " + reason.message);
                $scope.searching = false;
            });
        };

        $scope.addView = function(viewId) {
            var documentId = $scope.document.sysmlid;
            var workspace = ws;

            var branch = $scope.treeApi.get_selected_branch();
            var parentViewId = branch.data.sysmlid;

            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;  

            ViewService.getView(viewId, false, workspace)
            .then(function (data) {
                
                var viewOb = data;

                ViewService.addViewToDocument(viewId, documentId, parentViewId, workspace, viewOb)
                .then(function(data) {
                    growl.success("View Added");
                    $modalInstance.close(viewOb);
                }, function(reason) {
                    growl.error("View Add Error: " + reason.message);
                }).finally(function() {
                    $scope.oking = false;
                }); 

            }, function(reason) {
                growl.error("View Add Error: " + reason.message);
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
            var promise;

            // Item specific promise:
            if ($scope.itemType === 'Workspace') {
                var workspaceObj = {"name": $scope.workspace.name, "description": $scope.workspace.description,
                                    "permission": $scope.workspace.permission};
                workspaceObj.parent = $scope.createWsParentId;
                workspaceObj.branched = $scope.createWsTime;
                promise = WorkspaceService.create(workspaceObj);
            }
            else if ($scope.itemType === 'Tag') {
                var config = {"name": $scope.configuration.name, "description": $scope.configuration.description};
                if ($scope.configuration.now === "false") {
                    config.timestamp = $filter('date')($scope.configuration.timestamp, 'yyyy-MM-ddTHH:mm:ss.sssZ');
                }
                promise = ConfigService.createConfig(config, $scope.createConfigParentId);
            }
            else if ($scope.itemType === 'Document') {
                promise = ViewService.createDocument($scope.doc.name, $scope.addDocSite, $scope.ws);
            }
            else if ($scope.itemType === 'View') {
                promise = ViewService.createView($scope.createViewParentId, $scope.newView.name, 
                                                 $scope.document.sysmlid, ws);
            }
            else {
                growl.error("Add Item of Type " + $scope.itemType + " is not supported");
                $scope.oking = false;
                return;
            }

            
            // Handle the promise:
            promise
            .then(function(data) {
                growl.success(displayName+" Created");

                if ($scope.itemType === 'Tag') {
                    growl.info('Please wait for a completion email prior to viewing of the tag.');
                }

                $modalInstance.close(data);
            }, function(reason) {
                growl.error("Create "+displayName+" Error: " + reason.message);
            }).finally(function() {
                $scope.oking = false;
            });
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    };

    function addViewSections(view) {
        var node = viewId2node[view.sysmlid];
        addSectionElements(view, node, node);
        $scope.treeApi.refresh();
        if (view.specialization.displayedElements && view.specialization.displayedElements.length < 20) {
            ViewService.getViewElements(view.sysmlid, false, ws, time);
        }
    }

    if ($state.includes('workspace.site.document')) {
        var delay = 300;
        if (document.specialization.view2view) {
            document.specialization.view2view.forEach(function(view, index) {
                $timeout(function() {
                    ViewService.getView(view.id, false, ws, time)
                    .then(addViewSections);
                    /*ViewService.getViewElements(view.id, false, ws, time)
                    .then(function() {
                        ViewService.getView(view.id, false, ws, time)
                        .then(addViewSections);
                    });*/
                }, delay*index);
            });
        }
    }
}])
.controller('ReorderCtrl', ['$scope', '$rootScope', '$stateParams', 'document', 'time', 'ElementService', 'ViewService', '$state', 'growl', '_',
function($scope, $rootScope, $stateParams, document, time, ElementService, ViewService, $state, growl, _) {
    $scope.doc = document;
    var ws = $stateParams.workspace;
    ElementService.isCacheOutdated(document.sysmlid, ws)
    .then(function(status) {
        if (status.status) {
            if (!angular.equals(document.specialization.view2view, status.server.specialization.view2view)) {
                growl.error('The document hierarchy is outdated, refresh the page first!');
            } 
        } 
    }, function(reason) {
        growl.error('Checking if document hierarchy is up to date failed: ' + reason.message);
    });
    var viewIds2node = {};
    viewIds2node[document.sysmlid] = {
        name: document.name,
        id: document.sysmlid,
        children: []
    };
    var up2dateViews = null;

    ViewService.getDocumentViews(document.sysmlid, false, ws, time, true)
    .then(function(views) {
        up2dateViews = views;
        up2dateViews.forEach(function(view) {
            var viewTreeNode = { 
                id: view.sysmlid, 
                name: view.name, 
                children : [] 
            };
            viewIds2node[view.sysmlid] = viewTreeNode;    
        });
        document.specialization.view2view.forEach(function(view) {
            var viewId = view.id;
            view.childrenViews.forEach(function(childId) {
                viewIds2node[viewId].children.push(viewIds2node[childId]);
            });
        });
        $scope.tree = [viewIds2node[document.sysmlid]];
    });
    $scope.saveClass = "";
    $scope.save = function() {
        $scope.saveClass = "fa fa-spin fa-spinner";
        ElementService.isCacheOutdated(document.sysmlid, ws)
        .then(function(status) {
            if (status.status) {
                if (!angular.equals(document.specialization.view2view, status.server.specialization.view2view)) {
                    growl.error('The document hierarchy is outdated, refresh the page first!');
                    $scope.saveClass = "";
                    return;
                } 
            } 

            if ($scope.tree.length > 1 || $scope.tree[0].id !== document.sysmlid) {
                growl.error('Views cannot be re-ordered outside the context of the current document.');
                $scope.saveClass = "";
                return;
            }

            var newView2View = [];
            angular.forEach(viewIds2node, function(view) {
                if ($scope.tree.indexOf(view) >= 0 && view.id !== document.sysmlid)
                    return; //allow removing views by moving them to be root
                var viewObject = {id: view.id, childrenViews: []};
                view.children.forEach(function(child) {
                    viewObject.childrenViews.push(child.id);
                });
                newView2View.push(viewObject);
            });
            var newdoc = {};
            newdoc.sysmlid = document.sysmlid;
            //newdoc.read = document.read;
            newdoc.specialization = {type: 'Product'};
            newdoc.specialization.view2view = newView2View;
            ViewService.updateDocument(newdoc, ws)
            .then(function(data) {
                growl.success('Reorder Successful');
                //document.specialization.view2view = newView2View;
                $state.go('workspace.site.document', {}, {reload:true});
            }, function(reason) {
                if (reason.status === 409) {
                    newdoc.read = reason.data.elements[0].read;
                    ViewService.updateDocument(newdoc, ws)
                    .then(function(data2) {
                        growl.success('Reorder Successful');
                        //document.specialization.view2view = newView2View;
                        $state.go('workspace.site.document', {}, {reload:true});
                    }, function(reason2) {
                        $scope.saveClass = "";
                        growl.error('Reorder Save Error: ' + reason2.message);
                    });
                } else {
                    $scope.saveClass = "";
                    growl.error('Reorder Save Error: ' + reason.message);
                }
            });
        }, function(reason) {
            growl.error('Checking if document hierarchy is up to date failed: ' + reason.message);
            $scope.saveClass = "";
        });
    };
    $scope.cancel = function() {
        var curBranch = $rootScope.mms_treeApi.get_selected_branch();
        if (!curBranch)
            $state.go('workspace.site.document', {}, {reload:true});
        else
            $state.go('workspace.site.document.view', {view: curBranch.data.sysmlid});
    };
}])
.controller('FullDocCtrl', ['$scope', '$rootScope', '$stateParams', 'document', 'time', 'UxService',
function($scope, $rootScope, $stateParams, document, time, UxService) {
    $scope.ws = $stateParams.workspace;
    var views = [];
    if (!$rootScope.veCommentsOn)
        $rootScope.veCommentsOn = false;
    if (!$rootScope.veElementsOn)
        $rootScope.veElementsOn = false;
    $scope.buttons = [];
    views.push({id: document.sysmlid, api: {
        init: function(dis) {
            if ($rootScope.veCommentsOn) {
                dis.toggleShowComments();
            }
            if ($rootScope.veElementsOn) {
                dis.toggleShowElements();
            }
        }
    }});
    var view2view = document.specialization.view2view;
    var view2children = {};
    view2view.forEach(function(view) {
        view2children[view.id] = view.childrenViews;
    });

    var addToArray = function(viewId, curSection) {
        views.push({id: viewId, api: {
            init: function(dis) {
                if ($rootScope.veCommentsOn) {
                    dis.toggleShowComments();
                }
                if ($rootScope.veElementsOn) {
                    dis.toggleShowElements();
                }
            }
        }, number: curSection});
        if (view2children[viewId]) {
            var num = 1;
            view2children[viewId].forEach(function(cid) {
                addToArray(cid, curSection + '.' + num);
                num = num + 1;
            });
        }
    };
    var num = 1;
    view2children[document.sysmlid].forEach(function(cid) {
        addToArray(cid, num);
        num = num + 1;
    });
    $scope.version = time;
    $scope.views = views;
    $scope.tscClicked = function(elementId) {
        $rootScope.$broadcast('elementSelected', elementId, 'element');
    };

    $scope.bbApi = {};
    $scope.bbApi.init = function() {
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.comments'));
        $scope.bbApi.setToggleState('show.comments', $rootScope.veCommentsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.elements'));
        $scope.bbApi.setToggleState('show.elements', $rootScope.veElementsOn);
    };
    $scope.$on('show.comments', function() {
        $scope.views.forEach(function(view) {
            view.api.toggleShowComments();
        });
        $scope.bbApi.toggleButtonState('show.comments');
        $rootScope.veCommentsOn = !$rootScope.veCommentsOn;
    });

    $scope.$on('show.elements', function() {
        $scope.views.forEach(function(view) {
            view.api.toggleShowElements();
        });
        $scope.bbApi.toggleButtonState('show.elements');
        $rootScope.veElementsOn = !$rootScope.veElementsOn;
    });
    $rootScope.mms_fullDocMode = true;
}])
.controller('WorkspaceDiffChangeController', ["_", "$timeout", "$scope", "$rootScope", "$http", "$state", "$stateParams", "$modal", "growl", "WorkspaceService", "ElementService", "diff",
function(_, $timeout, $scope, $rootScope, $http, $state, $stateParams, $modal, growl, WorkspaceService, ElementService, diff) {

    var ws1 = $stateParams.target;
    var ws2 = $stateParams.source;

    $scope.treeApi = {};

    var treeApiLocal = $rootScope.treeApi;

    $scope.treeApi = treeApiLocal;

    $rootScope.treeData = [];

    $scope.diff = diff;
    
    $scope.changes = [];

    $scope.id2change = {};

    $rootScope.id2node = {};

    $scope.stagedCounter = 0;
    $scope.unstagedCounter = 0;

    $scope.options = {
      types: {
        'Element': 'fa fa-square',
        'Property': 'fa fa-circle',
        'View': 'fa fa-square',
        'Dependency': 'fa fa-long-arrow-right',
        'DirectedRelationship': 'fa fa-long-arrow-right',
        'Generalization': 'fa fa-chevron-right',
        'Package': 'fa fa-folder',
        'Connector': 'fa fa-expand'
      },
      statuses: {
        'moved'   : { style: "moved" },
        'added'   : { style: "addition" },
        'removed' : { style: "removal" },
        'updated' : { style: "update" },
        'conflict': { style: "" }
      }
    };

    var stageChange = function(change) {
      change.staged = ! change.staged;

      var treeNode = null;
      var index;

      if (change.type === "added") {
        treeNode = $scope.id2node[change.delta.sysmlid];

        var parentNode = $scope.id2node[change.delta.owner];
        
        if (change.staged) {
            if (!parentNode) {
                $rootScope.treeData.push(treeNode);
            } else {
                parentNode.children.push(treeNode);
            }
            treeNode.status = "added";
        } else {
            treeNode.status = "clean";
            if (!parentNode) {
                index = findIndexBySysMLID($rootScope.treeData, change.delta.sysmlid);
                $rootScope.treeData.splice(index, 1);
            } else {
                index = findIndexBySysMLID(parentNode.children, change.delta.sysmlid);
                parentNode.children.splice(index,1);
            }
        }
      } else if (change.type === "removed") {
        treeNode = $scope.id2node[change.original.sysmlid];

        if (change.staged) {
          treeNode.status = "removed";
        } else {
          treeNode.status = "clean";
        } 
      } else if (change.type === "updated") {
        treeNode = $scope.id2node[change.original.sysmlid];

        // handle if the name of element has changed on update
        if (change.staged) {
          treeNode.status = "updated";
          treeNode.data = change.delta;

        } else {
          treeNode.status = "clean";
          treeNode.data = change.original;
        }
      } else if (change.type === "moved") {
        treeNode = $scope.id2node[change.original.sysmlid];

        var currentParentNode = $scope.id2node[change.original.owner];
        var newParentNode = $scope.id2node[change.delta.owner];
        
        if (change.staged) {
          treeNode.status = "moved";

          // remove from current parent node
          index = findIndexBySysMLID(currentParentNode.children, change.original.sysmlid);
          currentParentNode.children.splice(index,1);

          // add to new parent node
          newParentNode.children.push(treeNode);

        } else {
          treeNode.status = "clean";

          // remove from new parent node
          currentParentNode.children.push(treeNode);

          // add back to current parent node
          index = findIndexBySysMLID(newParentNode.children, change.original.sysmlid);
          newParentNode.children.splice(index,1);

        }
      }      

      $rootScope.treeApi.refresh();
      $rootScope.treeApi.expand_all();

      refreshStageCounters();
    };

    $scope.goBack = function () {
      $state.go('workspace', {}, {reload:true});
    };

    $scope.mergeStagedChanges = function (workspaceId) {
        //var deletedElements = [];
        //var changedElements = [];

        var object = {
            workspace1: {
                id: ws1
            },
            workspace2: {
                id: ws2,
                addedElements: [],
                deletedElements: [],
                updatedElements: [],
                movedElements: []
            }
        };

        $scope.changes.forEach(function(change) {
            if (change.staged) {
                if (change.type === "removed") {
                    object.workspace2.deletedElements.push(change.ws2object);
            //deletedElements.push(change.original);
                } else if (change.type === 'updated') {
                    object.workspace2.updatedElements.push(change.ws2object);
                    delete change.ws2object.read;
                    delete change.ws2object.modified;
            //delete change.delta.read;
            //changedElements.push(change.delta);
                } else if (change.type === 'added') {
                    object.workspace2.addedElements.push(change.ws2object);
                } else if (change.type === 'moved') {
                    object.workspace2.movedElements.push(change.ws2object);
                }
            }
        });
        $scope.saving = true;
        WorkspaceService.merge(object, $stateParams.sourceTime)
        .then(function(data) {
              growl.success("Workspace Elements Merged");
              $scope.saving = false;
              $state.go('workspace', {}, {reload:true});
        }, function(reason) {
            growl.error("Workspace Merge Error: " + reason.message);
            $scope.saving = false;
        });
    };

    $scope.stageAllUnstaged = function (changes) {
      changes.forEach(function (change) {
        if (!change.staged) {
          stageChange(change);
        }
      });
    };

    $scope.unstageAllStaged = function (changes) {
      changes.forEach(function (change) {
        if (change.staged) {
          stageChange(change);
        }
      });
    };

    var refreshStageCounters = function () {
      $scope.stagedCounter = 0;
      $scope.unstagedCounter = 0;

      $scope.changes.forEach(function (change) {
        if (change.staged) {
          $scope.stagedCounter++;
        } else {
          $scope.unstagedCounter++;
        }
      });
    };

    var findIndexBySysMLID = function (array, sysmlid) {
     for (var i = 0; i < array.length; i++) {
        if (array[i].data.sysmlid === sysmlid) {
          return i;
        }
      }
      return -1; 
    };

    $scope.stageChange = stageChange;

    $scope.selectChange = function (change) {
      var elementId;
      if (change.type === "added")
        elementId = change.delta.sysmlid;
      else
        elementId = change.original.sysmlid;

      $state.go('workspace.diff.view', {elementId: elementId});
    };



    // Diff the two workspaces picked in the Workspace Picker
    /* WorkspaceService.diff(ws1, ws2).then(
     function(result) {
        
        setupChangesList(result.workspace1, result.workspace2); 

      },
      function(reason) {
        growl.error("Workspace diff failed: " + reason.message);
      }
    );   */

      /*
       * Preps mms-tree with data and display options.
       */
    var setupChangesList = function(ws1, ws2) {

        // var emptyElement = { name: "", owner: "", documentation: "", specialization : { type: "", value_type: "", values: ""} };

        var emptyElement = { name: "", owner: "", documentation: "", specialization : {} };

        var createChange = function (name, element, deltaElement, changeType, changeIcon, ws2object) {
          var change = {};
          
          change.name = name;
          change.original = element;
          change.delta = deltaElement;
          change.type = changeType;
          change.icon = changeIcon;
          change.staged = false;
          change.ws2object = ws2object;

          change.properties = {};
          change.properties.name = {};
          change.properties.owner = {};
          change.properties.documentation = {};

          updateChangeProperty(change.properties.name, "clean");
          updateChangeProperty(change.properties.owner, "clean");
          updateChangeProperty(change.properties.documentation, "clean");

          change.properties.specialization = {};
          if (element.hasOwnProperty('specialization')) {
            Object.keys(element.specialization).forEach(function (property) {
              change.properties.specialization[property] = {};
              updateChangeProperty(change.properties.specialization[property], "clean");
            });
          }
          if (deltaElement.hasOwnProperty('specialization')) {
            Object.keys(deltaElement.specialization).forEach(function (property) {
              change.properties.specialization[property] = {};
              updateChangeProperty(change.properties.specialization[property], "clean");
            });
          }

          return change;
        };

        var updateChangeProperty = function(property, changeType) {
          property.type = changeType;
          property.staged = false;
        };

        // dynamically create 1st order of depth of specialization properties
        /*var updateChangePropertySpecializations = function(specialization, changeType) {

          Object.keys(specialization).forEach(function (property) {
            specialization[property].type = changeType;
            specialization[property].staged = false;
          });

        }; */

        var createTreeNode = function (element, status) {
          var node = {};
          
          node.data = element;
          node.label = element.name;
          node.type = element.specialization.type;
          node.children = [];

          // node.visible = true;
          node.status = status;

          return node;
        };

        var id2data = {};
        var id2node = {};

        ws1.elements.forEach(function(e) {
          id2data[e.sysmlid] = e;

          var node = createTreeNode(e, "clean");

          id2node[e.sysmlid] = node;

        });

        ws1.elements.forEach(function(e) {
          if (!id2node.hasOwnProperty(e.owner)) 
              $rootScope.treeData.push(id2node[e.sysmlid]);          
          else
              id2node[e.owner].children.push(id2node[e.sysmlid]);
        });

        // $scope.treeApi.refresh();
        // $scope.treeApi.expand_all();

        ws2.addedElements.forEach(function(e) {
          id2data[e.sysmlid] = e;

          var node = createTreeNode(e, "clean");

          id2node[e.sysmlid] = node;

          var change = createChange(e.name, emptyElement, e, "added", "fa-plus", e);

          updateChangeProperty(change.properties.name, "added");
          updateChangeProperty(change.properties.owner, "added");
          updateChangeProperty(change.properties.documentation, "added");
          
          if (e.hasOwnProperty('specialization')) {
            Object.keys(e.specialization).forEach(function (property) {
              change.properties.specialization[property] = {};
              updateChangeProperty(change.properties.specialization[property], "added");
            });            
          }

          $scope.changes.push(change);
          $scope.id2change[e.sysmlid] = change;

        });

        ws2.deletedElements.forEach(function(e) {

          var deletedElement = id2data[e.sysmlid];

          var change = createChange(deletedElement.name, deletedElement, emptyElement, "removed", "fa-times", e);

          updateChangeProperty(change.properties.name, "removed");
          updateChangeProperty(change.properties.owner, "removed");
          updateChangeProperty(change.properties.documentation, "removed");
          
          if (deletedElement.hasOwnProperty('specialization')) {
            Object.keys(deletedElement.specialization).forEach(function (property) {
              change.properties.specialization[property] = {};
              updateChangeProperty(change.properties.specialization[property], "removed");
            });            
          }

          $scope.changes.push(change);
          $scope.id2change[e.sysmlid] = change;

        });

        ws2.updatedElements.forEach(function(e) {

          var updatedElement = id2data[e.sysmlid];

          var deltaElement = _.cloneDeep(updatedElement);

          var change = createChange(updatedElement.name, updatedElement, deltaElement, "updated", "fa-pencil", e);

          if (e.hasOwnProperty('name')) {
            change.name = e.name;
            deltaElement.name = e.name;
            updateChangeProperty(change.properties.name, "updated");
          }
          if (e.hasOwnProperty('owner')) {
            deltaElement.owner = e.owner;
            updateChangeProperty(change.properties.owner, "updated");
          }
          if (e.hasOwnProperty('documentation')) {
            deltaElement.documentation = e.documentation;
            updateChangeProperty(change.properties.documentation, "updated");
          }
          if (e.hasOwnProperty('specialization')) {
            Object.keys(e.specialization).forEach(function (property) {
              deltaElement.specialization[property] = e.specialization[property];
              change.properties.specialization[property] = {};
              updateChangeProperty(change.properties.specialization[property], "updated");
            });            
          }

          /* if (e.hasOwnProperty('specialization') && e.specialization.hasOwnProperty('type')) {
            deltaElement.specialization.type = e.specialization.type;
            updateChangeProperty(change.properties.specialization.type, "updated");
          }
          if (e.hasOwnProperty('specialization') && e.specialization.hasOwnProperty('value')) {
            deltaElement.specialization.value = e.specialization.value;
            updateChangeProperty(change.properties.specialization.value_type, "updated");
            updateChangeProperty(change.properties.specialization.values, "updated");
          } */

          $scope.changes.push(change);
          $scope.id2change[e.sysmlid] = change;

        });

        /*
          TODO: removing this was a hack, we removed it because the moved elements
          also show up in the updated list and creates duplicates 
           
          ws2.movedElements.forEach(function(e) {

          var movedElement = id2data[e.sysmlid];

          var deltaElement = _.cloneDeep(movedElement);

          var change = createChange(movedElement.name, movedElement, deltaElement, "moved", "fa-arrows", e);

          if (e.hasOwnProperty('owner')) {
            deltaElement.owner = e.owner;
            updateChangeProperty(change.properties.owner, "moved");
          }

          $scope.changes.push(change);
          $scope.id2change[e.sysmlid] = change;

        }); */

        $rootScope.id2node = id2node;

        var id2change = $scope.id2change;

        $rootScope.id2change = id2change;

        refreshStageCounters();
    };

    $timeout(function () { setupChangesList(diff.workspace1, diff.workspace2); } ); 
}])
.controller('WorkspaceDiffTreeController', ["_", "$timeout", "$scope", "$rootScope", "$http", "$state", "$stateParams", "$modal", "growl", "WorkspaceService", "ElementService", "diff",
function(_, $timeout, $scope, $rootScope, $http, $state, $stateParams, $modal, growl, WorkspaceService, ElementService, diff) {

    $scope.treeApi = {};

    $scope.treeData = [];
    
    $scope.treeData = $rootScope.treeData;

    $scope.options = {
      types: {
        'Element': 'fa fa-square',
        'Property': 'fa fa-circle',
        'View': 'fa fa-square',
        'Dependency': 'fa fa-long-arrow-right',
        'DirectedRelationship': 'fa fa-long-arrow-right',
        'Generalization': 'fa fa-chevron-right',
        'Package': 'fa fa-folder',
        'Connector': 'fa fa-expand'
      },
      statuses: {
        'moved'   : { style: "moved" },
        'added'   : { style: "addition" },
        'removed' : { style: "removal" },
        'updated' : { style: "update" },
        'conflict': { style: "" }
      }
    };

    var options = $scope.options;

    $rootScope.options = options;

    $timeout(function () { $scope.treeApi.refresh(); $scope.treeApi.expand_all(); $rootScope.treeApi = $scope.treeApi; } ); 
}])
.controller('WorkspaceDiffElementViewController', ["_", "$timeout", "$scope", "$rootScope", "$http", "$state", "$stateParams", "$modal", "growl", "WorkspaceService", "ElementService", "diff",
function(_, $timeout, $scope, $rootScope, $http, $state, $stateParams, $modal, growl, WorkspaceService, ElementService, diff) {
    $scope.source = $stateParams.source;
    $scope.target = $stateParams.target;
    $scope.sourceTime = $stateParams.sourceTime;
    $scope.targetTime = $stateParams.targetTime;
    $scope.diff = diff;

    $scope.options = $rootScope.options;

    $scope.change = $rootScope.id2change[$stateParams.elementId];
}]);