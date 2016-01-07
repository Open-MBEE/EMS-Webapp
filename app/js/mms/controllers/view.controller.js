'use strict';

/* Controllers */

angular.module('mmsApp')
.controller('ViewCtrl', ['$scope', '$rootScope', '$state', '$stateParams', '$timeout', '$modal', '$window', 'viewElements', 'MmsAppUtils', 'ElementService', 'ViewService', 'ConfigService', 'time', 'search', 'growl', 'workspace', 'site', 'document', 'view', 'tag', 'snapshot', 'UxService', 'hotkeys',
function($scope, $rootScope, $state, $stateParams, $timeout, $modal, $window, viewElements, MmsAppUtils, ElementService, ViewService, ConfigService, time, search, growl, workspace, site, document, view, tag, snapshot, UxService, hotkeys) {
    
    /*$scope.$on('$viewContentLoaded', 
        function(event) {
            $rootScope.mms_viewContentLoading = false; 
        }
    );*/

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
    if (!$rootScope.mms_ShowEdits)
        $rootScope.mms_ShowEdits = false;

    var ws = $stateParams.workspace;
    $scope.search = search;
    $scope.ws = ws;
    $scope.view = view;
    $scope.viewElements = viewElements;
    $scope.site = site;
    var elementSaving = false;
    $scope.bbApi = {};
    $scope.buttons = [];

    $scope.bbApi.init = function() {
        if ($state.includes('workspace.site.document')) {
            $scope.bbApi.addButton(UxService.getButtonBarButton('print'));
            $scope.bbApi.addButton(UxService.getButtonBarButton('word'));
            $scope.bbApi.addButton(UxService.getButtonBarButton('tabletocsv'));
        }
        if (view && view.editable && time === 'latest') {
            $scope.bbApi.addButton(UxService.getButtonBarButton('show.edits'));
            $scope.bbApi.setToggleState('show.edits', $rootScope.mms_ShowEdits);
            hotkeys.bindTo($scope)
            .add({
                combo: 'alt+d',
                description: 'toggle edit mode',
                callback: function() {$scope.$broadcast('show.edits');}
            });
            if ($scope.view.specialization.contents || $scope.view.specialization.type === 'InstanceSpecification') {
                $scope.bbApi.addButton(UxService.getButtonBarButton('view.add.dropdown'));
            } else {
                var fakeDropdown = {
                    id: 'view.add.dropdown.fake', 
                    icon: 'fa-plus', 
                    selected: true, 
                    active: true, 
                    permission: true, 
                    tooltip: 'Add New Element Disabled', 
                    spinner: false, 
                    togglable: false, 
                    action: function() {
                        growl.warning("This view hasn't been converted to support adding new elements.");
                    }
                };
                $scope.bbApi.addButton(fakeDropdown);
            }
        }
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.comments'));
        $scope.bbApi.setToggleState('show.comments', $rootScope.veCommentsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('show.elements'));
        $scope.bbApi.setToggleState('show.elements', $rootScope.veElementsOn);
        hotkeys.bindTo($scope)
        .add({
            combo: 'alt+c',
            description: 'toggle show comments',
            callback: function() {$scope.$broadcast('show.comments');}
        }).add({
            combo: 'alt+e',
            description: 'toggle show elements',
            callback: function() {$scope.$broadcast('show.elements');}
        });
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
                hotkeys.bindTo($scope)
                .add({
                    combo: 'alt+.',
                    description: 'next',
                    callback: function() {$scope.$broadcast('center.next');}
                }).add({
                    combo: 'alt+,',
                    description: 'previous',
                    callback: function() {$scope.$broadcast('center.previous');}
                });
                if ($rootScope.mms_treeApi && $rootScope.mms_treeApi.get_selected_branch) {
                    var selected_branch = $rootScope.mms_treeApi.get_selected_branch();
                    while (selected_branch && selected_branch.type !== 'view' && view.specialization.type !== 'InstanceSpecification') {
                        selected_branch = $rootScope.mms_treeApi.get_parent_branch(selected_branch);
                    }
                    if (selected_branch)
                        $scope.sectionNumber = selected_branch.section;
                }
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
    var artifactWarning = 'WARNING: There is a known issue with artifacts (including PDFs) generated from tags prior to April 11, 2015 where the content may not be accurate. In the event of a conflict between the generated artifacts and the associated View Editor web content, the information in View Editor shall take precedence.';
    $scope.$on('generate.pdf', function() {
        if (getPDFStatus() === 'Generating...')
            return;
        if (time < '2015-04-11')
            $window.alert(artifactWarning);
        $scope.bbApi.toggleButtonSpinner('generate.pdf');
        $scope.bbApi.toggleButtonSpinner('generate.zip');

        snapshot.formats.push({"type":"pdf",  "status":"Generating"});
        snapshot.formats.push({"type":"html", "status":"Generating"});
        snapshot.ws = ws;
        snapshot.site = site.sysmlid;
        snapshot.time = time;
        
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
        if (time < '2015-04-11')
            $window.alert(artifactWarning);
        $window.open(getPDFUrl());

    });

    $scope.$on('download.zip', function() {
        if (time < '2015-04-11')
            $window.alert(artifactWarning);
        $window.open(getZipUrl());
    });

    $scope.$on('view.add.paragraph', function() {
        MmsAppUtils.addPresentationElement($scope, 'Paragraph', view);
    });

    $scope.$on('view.add.list', function() {
        MmsAppUtils.addPresentationElement($scope, 'List', view);
    });

    $scope.$on('view.add.table', function() {
        MmsAppUtils.addPresentationElement($scope, 'Table', view);
    });

    $scope.$on('view.add.section', function() {
        MmsAppUtils.addPresentationElement($scope, 'Section', view);
    });

    $scope.$on('view.add.comment', function() {
        MmsAppUtils.addPresentationElement($scope, 'Comment', view);
    });

    $scope.$on('view.add.image', function() {
        MmsAppUtils.addPresentationElement($scope, 'Figure', view);
    });
/*
    $scope.$on('view.add.equation', function() {
        addElement('Equation');
    });
*/
    $scope.$on('section.add.paragraph', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Paragraph', section);
    });

    $scope.$on('section.add.list', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'List', section);
    });

    $scope.$on('section.add.table', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Table', section);
    });
/*
    $scope.$on('section.add.equation', function(event, section) {
        addElement('Equation', section);
    });
*/
    $scope.$on('section.add.section', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Section', section);
    });

    $scope.$on('section.add.comment', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Comment', section);
    });

    $scope.$on('section.add.image', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Figure', section);
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
        $rootScope.mms_ShowEdits = !$rootScope.mms_ShowEdits;
        if ($scope.filterApi.setEditing)
            $scope.filterApi.setEditing($rootScope.mms_ShowEdits);
    });

    $scope.$on('center.previous', function() {
        var prev = $rootScope.mms_treeApi.get_prev_branch($rootScope.mms_treeApi.get_selected_branch());
        if (!prev)
            return;
        $scope.bbApi.toggleButtonSpinner('center.previous');
        $rootScope.mms_treeApi.select_branch(prev);
        if (prev.type === 'section')
            $scope.bbApi.toggleButtonSpinner('center.previous');
    });

    $scope.$on('center.next', function() {
        var next = $rootScope.mms_treeApi.get_next_branch($rootScope.mms_treeApi.get_selected_branch());
        if (!next)
            return;
        $scope.bbApi.toggleButtonSpinner('center.next');
        $rootScope.mms_treeApi.select_branch(next);
        if (next.type === 'section')
            $scope.bbApi.toggleButtonSpinner('center.next');
    });

    if (view) {
        if (view.specialization.contains || view.specialization.contents) {
            ViewService.setCurrentViewId(view.sysmlid);
            $rootScope.veCurrentView = view.sysmlid;
        }
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
    $scope.searchOptions= {};
    $scope.searchOptions.callback = function(elem) {
        $scope.tscClicked(elem.sysmlid);
    };
    $scope.searchOptions.emptyDocTxt = 'This field is empty.';

    $scope.elementTranscluded = function(element, type) {
        if (type === 'Comment' && !$scope.comments.hasOwnProperty(element.sysmlid)) {
            $scope.comments[element.sysmlid] = element;
            $scope.numComments++;
            if (element.modified > $scope.lastCommented) {
                $scope.lastCommented = element.modified;
                $scope.lastCommentedBy = element.modifier;
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
        if ($rootScope.mms_ShowEdits && time === 'latest') {
            $scope.viewApi.toggleShowEdits();
        }
    };

    $scope.searchGoToDocument = function (doc, view, elem) {//siteId, documentId, viewId) {
        $state.go('workspace.site.document.view', {site: doc.siteCharacterizationId, document: doc.sysmlid, view: view.sysmlid, tag: undefined, search: undefined});
    };
    $scope.searchOptions.relatedCallback = $scope.searchGoToDocument;

    $scope.$on('print', function() {
        MmsAppUtils.popupPrintConfirm(view, $scope.ws, time, false, true);
    });
    $scope.$on('word', function() {
        MmsAppUtils.popupPrintConfirm(view, $scope.ws, time, false, false);
    });
    $scope.$on('tabletocsv', function() {
        MmsAppUtils.tableToCsv(view, $scope.ws, time, false);
    });
}]);