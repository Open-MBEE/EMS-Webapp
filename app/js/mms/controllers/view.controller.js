'use strict';

/* Controllers */

angular.module('mmsApp')
.controller('ViewCtrl', ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$modal', '$window', 'viewElements', 'ElementService', 'ViewService', 'ConfigService', 'time', 'growl', 'workspace', 'site', 'document', 'view', 'tag', 'snapshot', 'UxService',
function($scope, $rootScope, $state, $stateParams, $timeout, $modal, $window, viewElements, ElementService, ViewService, ConfigService, time, growl, workspace, site, document, view, tag, snapshot, UxService) {
    
    $scope.$on('$viewContentLoaded', 
        function(event) {
            $rootScope.mms_viewContentLoading = false; 
        }
    );

    if ($state.includes('workspace') && !$state.includes('workspace.sites')) {
        $rootScope.mms_showSiteDocLink = true;
    } else {
        $rootScope.mms_showSiteDocLink = false;
    }

    // show the tag descriptions if document is null 
    $rootScope.mms_showTagDescriptionFix = false;
    if ($state.includes('workspace') && !$state.includes('workspace.sites')) {
        // if document is null, and there is a tag, then save the tag to be used for
        // the tag cover page
        if (document === null && time !== 'latest' && tag !== null) {
            $rootScope.mms_showTagDescriptionFix = true;
            $rootScope.mms_showSiteDocLink = false;
            $scope.tag = tag;
        }
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
            $scope.bbApi.addButton(UxService.getButtonBarButton('view.add.dropdown'));
        }

        $scope.bbApi.addButton(UxService.getButtonBarButton('edit.view.documentation.save'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('edit.view.documentation.cancel'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.comments'));
        $scope.bbApi.setToggleState('show.comments', $rootScope.veCommentsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.elements'));
        $scope.bbApi.setToggleState('show.elements', $rootScope.veElementsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.edits'));
        $scope.bbApi.setToggleState('show.edits', false);

        // TODO: This code is duplicated in the FullDocCtrl
        // **WARNING** IF YOU CHANGE THIS CODE, NEED TO UPDATE IN FULL DOC CTRL TOO

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

    // TODO: This code is duplicated in the FullDocCtrl
    // **WARNING** IF YOU CHANGE THIS CODE, NEED TO UPDATE IN FULL DOC CTRL TOO
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
        var waitForFilter = false;
        $scope.bbApi.toggleButtonSpinner('edit.view.documentation.save');
        $scope.specApi.save().then(function(data) {
            if ($scope.filterApi.getEditing && $scope.filterApi.getEditing()) {
                waitForFilter = true;
                $scope.filterApi.save().then(function(filter) {
                    $state.reload();
                }, function(reason) {
                    growl.error("Filter save error: " + reason.message);
                }).finally(function() {
                    $scope.bbApi.setPermission('edit.view.documentation',true);
                    $scope.bbApi.setPermission('edit.view.documentation.save',false);
                    $scope.bbApi.setPermission('edit.view.documentation.cancel',false);
                    $scope.bbApi.toggleButtonSpinner('edit.view.documentation.save');
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
            if (!waitForFilter) {
                $scope.bbApi.setPermission('edit.view.documentation',true);
                $scope.bbApi.setPermission('edit.view.documentation.save',false);
                $scope.bbApi.setPermission('edit.view.documentation.cancel',false);
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
            if (!waitForFilter)
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
 
    var handleError = function(reason) {
        if (reason.type === 'info')
            growl.info(reason.message);
        else if (reason.type === 'warning')
            growl.warning(reason.message);
        else if (reason.type === 'error')
            growl.error(reason.message);
    };

    var addElementCtrl = function($scope, $modalInstance, $filter) {

        $scope.oking = false;
        $scope.newItem = {};
        $scope.newItem.name = "";

        $scope.searching = false;

        // Search for InstanceSpecs.  We are searching for InstanceSpecs b/c we only want to
        // create a InstanceValue to point to that InstanceSpec when cross-referencing.
        $scope.search = function(searchText) {
            //var searchText = $scope.searchText; //TODO investigate why searchText isn't in $scope
            //growl.info("Searching...");
            $scope.searching = true;

            ElementService.search(searchText, false, ws)
            .then(function(data) {

                // Filter out anything that is not a InstanceSpecification or not of the correct type:
                for (var i = 0; i < data.length; i++) {
                    if (data[i].specialization.type != 'InstanceSpecification') {
                        data.splice(i, 1);
                        i--;
                    }
                    else if (data[i].specialization.classifier[0].indexOf($scope.presentationElemType) == -1) {
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

        // Adds a InstanceValue to the view given the sysmlid of the InstanceSpecification
        $scope.addElement = function(elementId) {

            if ($scope.oking) {
                growl.info("Please wait...");
                return;
            }
            $scope.oking = true;  

            ViewService.addInstanceVal(view, workspace, elementId).
            then(function(data) {
                growl.success("Adding "+$scope.presentationElemType+"  Successful");
                $modalInstance.close(data);
            }, function(reason) {
                growl.error($scope.presentationElemType+" Add Error: " + reason.message);
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

            ViewService.createAndAddElement(view, workspace, true, $scope.presentationElemType, site.sysmlid, $scope.newItem.name).
            then(function(data) {
                growl.success("Adding "+$scope.presentationElemType+"  Successful");
                $modalInstance.close(data);
            }, function(reason) {
                growl.error($scope.presentationElemType+" Add Error: " + reason.message);
            }).finally(function() {
                $scope.oking = false;
            }); 
        };

        $scope.cancel = function() {
            $modalInstance.dismiss();
        };

    };

    var addElement = function(type) {

        $scope.presentationElemType = type;
        $scope.newItem = {};
        $scope.newItem.name = "";
        var templateUrlStr = 'partials/mms/add-item.html';

        var instance = $modal.open({
            templateUrl: templateUrlStr,
            scope: $scope,
            controller: ['$scope', '$modalInstance', '$filter', addElementCtrl]
        });
        instance.result.then(function(data) {
            // TODO: do anything here?
        });
    };

    $scope.$on('view.add.paragraph', function() {
        addElement('Paragraph');
    });

    $scope.$on('view.add.list', function() {
        addElement('List');
    });

    $scope.$on('view.add.table', function() {
        addElement('Table');
    });

    $scope.$on('view.add.section', function() {
        addElement('Section');
    });

    $scope.$on('view.add.image', function() {
        addElement('Image');
    });

    $scope.$on('element.edit', function(event, instanceVal) {

        // $scope.editing = !$scope.editing;
        $scope.viewApi.setEditingInstance(instanceVal.instance);
        $scope.editingInstance = !$scope.editingInstance;

        $scope.specApi.setEditing(true);
        if ($scope.filterApi.setEditing)
            $scope.filterApi.setEditing(true);
        
        // TODO: refactor as directive 
        // $scope.bbApi.setPermission('edit.view.documentation',false);
        // $scope.bbApi.setPermission('edit.view.documentation.save',true);
        // $scope.bbApi.setPermission('edit.view.documentation.cancel',true);
        
        var edit = $scope.specApi.getEdits();
        if (edit) {
            // TODO: this code may be better if automatically handled as part of the specApi
            $rootScope.veEdits['element|' + edit.sysmlid + '|' + ws] = edit;
            $rootScope.mms_tbApi.setIcon('element.editor', 'fa-edit-asterisk');
            if (Object.keys($rootScope.veEdits).length > 1) {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', true);
            } else {
                $rootScope.mms_tbApi.setPermission('element.editor.saveall', false);
            }
        }

        // TODO: Should this check the entire or just the instance specification
        // TODO: How smart does it need to be, since the instance specification is just a reference.
        // Will need to unravel until the end to check all references
        ElementService.isCacheOutdated(view.sysmlid, ws)
        .then(function(data) {
            if (data.status && data.server.modified > data.cache.modified)
                growl.warning('This view has been updated on the server');
        });
    });

    $scope.$on('element.edit.cancel', function(event, instanceVal) {
        $scope.viewApi.clearEditingInstance();

        // TODO: simplify all this into the edit api

        /* var go = function() {
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

        */
    });

    $scope.$on('element.delete', function(event, instanceVal, presentationElem) {
        ViewService.deleteElementFromView(view.sysmlid, workspace, instanceVal).then(function(data) {
            growl.success('Delete Successful');
        }, handleError).finally(function() {
            // $scope.bbApi.toggleButtonSpinner('edit.view.documentation.save');
        });

        if (ViewService.isSection(presentationElem)) {
            // Broadcast message to TreeCtrl:
            $rootScope.$broadcast('viewctrl.delete.section', presentationElem.name);
        }
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

    $scope.$on('show.edits', function() {
        $scope.viewApi.toggleShowEdits();
        $scope.bbApi.toggleButtonState('show.edits');
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
}]);