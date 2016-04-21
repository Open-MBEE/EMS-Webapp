'use strict';

/* Controllers */

angular.module('mmsApp')

.controller('FullDocCtrl', ['$scope', '$templateCache', '$compile', '$timeout', '$rootScope', '$state', '$stateParams', '$window', 'MmsAppUtils', 'document', 'workspace', 'site', 'snapshot', 'time', 'tag', 'ConfigService', 'UxService', 'ViewService', 'UtilsService', 'growl', 'hotkeys', 'search', '_',
function($scope, $templateCache, $compile, $timeout, $rootScope, $state, $stateParams, $window, MmsAppUtils, document, workspace, site, snapshot, time, tag, ConfigService, UxService, ViewService, UtilsService, growl, hotkeys, search, _) {

    $scope.ws = $stateParams.workspace;
    $scope.site = site;
    $scope.search = search;
    var views = [];
    if (!$rootScope.veCommentsOn)
        $rootScope.veCommentsOn = false;
    if (!$rootScope.veElementsOn)
        $rootScope.veElementsOn = false;
    if (!$rootScope.mms_ShowEdits)
        $rootScope.mms_ShowEdits = false;
    $scope.buttons = [];
    views.push({id: document.sysmlid, api: {
        init: function(dis) {
            if ($rootScope.veCommentsOn) {
                dis.toggleShowComments();
            }
            if ($rootScope.veElementsOn) {
                dis.toggleShowElements();
            }
            if ($rootScope.mms_ShowEdits && time === 'latest') {
                dis.toggleShowEdits();
            }
        }
    }});
    var view2view = document.specialization.view2view;
    var view2children = {};
    view2view.forEach(function(view) {
        view2children[view.id] = view.childrenViews;
    });

    ViewService.setCurrentView(document);
    var buildViewElt = function(vId, curSec) {
      return {id: vId, api: {
            init: function(dis) {
                if ($rootScope.veCommentsOn) {
                    dis.toggleShowComments();
                }
                if ($rootScope.veElementsOn) {
                    dis.toggleShowElements();
                }
                if ($rootScope.mms_ShowEdits && time === 'latest') {
                    dis.toggleShowEdits();
                }
            }
        }, number: curSec};
    };
    var addToArray = function(viewId, curSection) {
        views.push( buildViewElt(viewId, curSection) );
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

    $scope.$on('newViewAdded', function(event, vId, curSec, prevSibId) {
        var sibIndex = _.findIndex(views, {id: prevSibId});
        views.splice(sibIndex+1, 0, buildViewElt(vId, curSec) );
    });
    
    $scope.bbApi = {};
    $scope.bbApi.init = function() {

        if (document && document.editable && time === 'latest') {
            $scope.bbApi.addButton(UxService.getButtonBarButton('show.edits'));
            $scope.bbApi.setToggleState('show.edits', $rootScope.mms_ShowEdits);
            hotkeys.bindTo($scope)
            .add({
                combo: 'alt+d',
                description: 'toggle edit mode',
                callback: function() {$scope.$broadcast('show.edits');}
            });
        }

        $scope.bbApi.addButton(UxService.getButtonBarButton('show.comments'));
        $scope.bbApi.setToggleState('show.comments', $rootScope.veCommentsOn);
        $scope.bbApi.addButton(UxService.getButtonBarButton('print'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('convert.pdf'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('word'));
        $scope.bbApi.addButton(UxService.getButtonBarButton('tabletocsv'));
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
    };

    var converting = false;

    $scope.$on('convert.pdf', function() {
        if (converting) {
            growl.info("Please wait...");
            return;
        }
        converting = true;
        $scope.bbApi.toggleButtonSpinner('convert.pdf');
        MmsAppUtils.popupPrintConfirm(document, $scope.ws, time, true, false, true, false, tag)
        .then(function(ob) {
            var cover = ob.cover;
            var html = ob.contents;
            var doc = {};
            doc.docId = document.sysmlid;
            doc.header = ob.header;
            doc.footer = ob.footer;
            doc.html = html;
            doc.cover = cover;
            doc.time = time;
            doc.version = ob.version;
            doc.dnum = ob.dnum;
            doc.displayTime = ob.time;
            doc.toc = ob.toc;
            doc.workspace = $scope.ws;
            doc.customCss = UtilsService.getPrintCss();
            if (!ob.genTotf) {
                doc.tof = '<div style="display:none;"></div>';
                doc.tot = '<div style="display:none;"></div>';
            }

            doc.name = document.sysmlid + '_' + time + '_' + new Date().getTime();
            if(time == 'latest') 
                doc.tagId = time;
            else {
                if(tag) 
                    doc.tagId = tag.name;
            }
            ConfigService.convertHtmlToPdf(doc, site.sysmlid, $scope.ws)
            .then(
                function(reuslt){
                    growl.info('Converting HTML to PDF...Please wait for a completion email');
                },
                function(reason){
                    growl.error("Failed to convert HTML to PDF: " + reason.message);
                }
            ).finally(function() {
                converting = false;
                $scope.bbApi.toggleButtonSpinner('convert.pdf');
            });
        }, function() {
            converting = false;
            $scope.bbApi.toggleButtonSpinner('convert.pdf');
        });
    });

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

    $scope.$on('show.edits', function() {
        $scope.views.forEach(function(view) {
            view.api.toggleShowEdits();
        });
        $scope.bbApi.toggleButtonState('show.edits');
        $rootScope.mms_ShowEdits = !$rootScope.mms_ShowEdits;
    });
    $rootScope.mms_fullDocMode = true;

    $scope.$on('section.add.paragraph', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Paragraph', section);
    });

    $scope.$on('section.add.section', function(event, section) {
        MmsAppUtils.addPresentationElement($scope, 'Section', section);
    });

    $scope.$on('print', function() {
        MmsAppUtils.popupPrintConfirm(document, $scope.ws, time, true, true, false, false, tag);
    });
    $scope.$on('word', function() {
        MmsAppUtils.popupPrintConfirm(document, $scope.ws, time, true, false, false, false, tag);
    });
    $scope.$on('tabletocsv', function() {
        MmsAppUtils.tableToCsv(document, $scope.ws, time, true);
    });

    $scope.searchOptions= {};
    $scope.searchOptions.callback = function(elem) {
        $scope.tscClicked(elem.sysmlid);
    };
    $scope.searchOptions.emptyDocTxt = 'This field is empty.';
    $scope.searchOptions.searchInput = $stateParams.search;
    $scope.searchOptions.searchResult = $scope.search;    

    $scope.searchGoToDocument = function (doc, view, elem) {//siteId, documentId, viewId) {
        $state.go('workspace.site.document.view', {site: doc.siteCharacterizationId, document: doc.sysmlid, view: view.sysmlid, tag: undefined, search: undefined});
    };
    $scope.searchOptions.relatedCallback = $scope.searchGoToDocument;
}]);