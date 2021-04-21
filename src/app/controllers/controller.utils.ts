import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


mmsApp.factory('MmsAppUtils', ['$q', '$uibModal','$timeout', '$location', '$window', 'growl',
    '$rootScope', '$filter', '$state', 'ElementService','ViewService', 'UtilsService', 'ButtonBarService', '_', MmsAppUtils]);

/**
 * @ngdoc service
 * @name mmsApp.MmsAppUtils
 *
 * @description
 * Utilities
 */
function MmsAppUtils($q, $uibModal, $timeout, $location, $window, growl,
    $rootScope, $filter, $state, ElementService, ViewService, UtilsService, ButtonBarService, _) {
    
    let bbApi = ButtonBarService;

    var tableToCsv = function(isDoc) { //Export to CSV button Pop-up Generated Here
         var modalInstance = $uibModal.open({
            templateUrl: 'partials/mms/tableExport.html',
            controller: ["$scope", "$uibModalInstance", "type", function($scope, $uibModalInstance, type) {
                $scope.type = type;
                $scope.export = function() {
                    $uibModalInstance.close('export');
                };
                $scope.cancel = function() {
                    $uibModalInstance.dismiss();
                };
            }],
            resolve: {
                type: function() { return isDoc ? 'DOCUMENT' : 'VIEW';}
            },
            backdrop: 'static',
            keyboard: false
        });

        var string = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>' +
            '<script>';
            string += 'function doClick(id) { ' +
            'var csvString = document.getElementById(id).value;' +
            'var blob = new Blob(["\\uFEFF" + csvString], { ' +
            '    type: "text/csv;charset=utf-8;" ' +
            '}); ' +
            '' +
            'if (window.navigator.msSaveOrOpenBlob) { ' +
            '    navigator.msSaveBlob(blob,\'TableData.csv\'); ' +
            '} else { ' +
            '' +
            '    var downloadContainer = $(\'<div data-tap-disabled="true"><a></a></div>\'); ' +
            '    var downloadLink = $(downloadContainer.children()[0]); ' +
            '    downloadLink.attr(\'href\', window.URL.createObjectURL(blob)); ' +
            '    downloadLink.attr(\'download\', \'TableData.csv\'); ' +
            '    downloadLink.attr(\'target\', \'_blank\'); ' +
            ' ' +
            '    $(window.document).find(\'body\').append(downloadContainer); ' +
            '    /* $timeout(function () { */ ' +
            '        downloadLink[0].click(); ' +
            '        downloadLink.remove(); ' +
            '    /* }, null); */ ' +
            '} ' +
            '} ';
        string += '</script>';

        modalInstance.result.then(function(choice) {
            if (choice === 'export') {
               var tableCSV = [];
               // Grab all tables and run export to csv fnc
                angular.element('#print-div').find("table").each(function(elt){
                    var tableObj = {
                        caption: 'no caption',
                        val: angular.element(this).table2CSV({delivery:'value'})
                    };
                    if ((<HTMLTableElement> this).caption) {
                        tableObj.caption = (<HTMLTableElement> this).caption.innerHTML;
                    }
                    tableCSV.push(tableObj);
                });
                var exportPopup = function(data) {
                    var generator = window.open('', 'csv', 'height=600,width=800,scrollbars=1');
                    generator.document.write('<html><head><title>Tables to CSV</title>');
                    generator.document.write('</head><body >');
                    generator.document.write(data);
                    generator.document.write('</body></html>');
                    generator.document.close();
                    return true;
                };
                // generate text area content for popup
                var genTextArea ='';
                var num = 0;
                angular.element(tableCSV).each(function(){
                    genTextArea += '<h2>'+ this.caption +'</h2><div><button class="btn btn-sm btn-primary" onclick="doClick(\'textArea'+num+'\')">Save CSV</button></div><textArea cols=100 rows=15 wrap="off" id="textArea'+num+'">';
                    genTextArea += this.val + '</textArea>';
                    num++;
                });
                genTextArea += string;
                exportPopup(genTextArea);
            }
        });
    };

    /**
     * @ngdoc method
     * @name mmsApp.MmsAppUtils#printModal
     * @methodOf mmsApp.MmsAppUtils
     *
     * @description
     * Click handler for print and export buttons. Opens modal or print 
     * confirmation and options to select from
     *
     * @param {Object} viewOrDocOb current document or view object
     * @param {Object} refOb current branch/tag object
     * @param {Boolean} isDoc viewOrDocOb is view or doc
     * @param {Number} mode 1 = print, 2 = word, 3 = pdf
     * @returns {Promise} The promise returned from UtilsService.exportHtmlAs - server response
     *
     */
    var printModal = function(viewOrDocOb, refOb, isDoc, mode) {
        var deferred = $q.defer();
        var modalInstance = $uibModal.open({
            templateUrl: 'partials/mms/printConfirm.html',
            controller: ["$scope", "$uibModalInstance", function($scope, $uibModalInstance) {
                $scope.type = isDoc ? 'DOCUMENT' : 'VIEW';
                $scope.action = mode === 1 ? 'print' : mode === 3 ? 'Generate PDF' : 'Generate word';
                $scope.label = mode === 3 ? 'PDF' : mode === 2 ? 'Word' : '';
                $scope.mode = mode;
                $scope.meta = {};
                $scope.customizeDoc = {};
                $scope.customizeDoc.useCustomStyle = false;
                var print = angular.element("#print-div");
                if (print.find('.mms-error').length > 0) {
                    $scope.hasError = true;
                }

                if (isDoc) {
                    // If _printCss, use to set doc css for export/print
                    $scope.customizeDoc.useCustomStyle = false;
                    if (viewOrDocOb._printCss) {
                        // If _printCss, show tab for custom css
                        $scope.customizeDoc.useCustomStyle = true;
                        $scope.customizeDoc.customCSS = viewOrDocOb._printCss;
                    } else {
                        $scope.customizeDoc.customCSS = UtilsService.getPrintCss(false, false, {});
                    }

                    // Get/Set document header/footer for PDF generation
                    $scope.meta = {
                        'top-left': 'loading...', top: 'loading...', 'top-right': 'loading...',
                        'bottom-left': 'loading...', bottom: 'loading...', 'bottom-right': 'loading...'
                    };
                    ViewService.getDocMetadata({
                        elementId: viewOrDocOb.id,
                        projectId: viewOrDocOb._projectId,
                        refId: viewOrDocOb._refId
                    }, 2).then(function(metadata) {
                        $scope.meta.top = metadata.top ? metadata.top : '';
                        $scope.meta.bottom = metadata.bottom ? metadata.bottom : '';
                        $scope.meta['top-left'] = metadata.topl ? metadata.topl : '';
                        $scope.meta['top-right'] = metadata.topr ? metadata.topr : '';
                        if (refOb && refOb.type === 'Tag') {
                            $scope.meta['top-right'] = $scope.meta['top-right'] + ' ' + refOb.name;
                        }
                        var displayTime = refOb.type === 'Tag' ? refOb._timestamp : 'latest';
                        if (displayTime === 'latest') {
                            displayTime = new Date();
                            displayTime = $filter('date')(displayTime, 'M/d/yy h:mm a');
                        }
                        $scope.meta['top-right'] = $scope.meta['top-right'] + ' ' + displayTime;
                        $scope.meta['bottom-left'] = metadata.bottoml ? metadata.bottoml : '';
                        $scope.meta['bottom-right'] = metadata.bottomr ? metadata.bottomr : 'counter(page)';
                    }, function(reason) {
                        $scope.meta['top-left'] = $scope.meta.top = $scope.meta['top-right'] = $scope.meta['bottom-left'] = $scope.meta.bottom = '';
                        $scope.meta['bottom-right'] = 'counter(page)';
                    });
                }
                $scope.unsaved = ($rootScope.ve_edits && !_.isEmpty($rootScope.ve_edits));
                $scope.docOption = (!isDoc && (mode === 3 || mode === 2));
                $scope.model = { genTotf: false, landscape: false, htmlTotf: false };
                
                $scope.saveStyleUpdate = function() {
                    // To only update _printCss, create new ob with doc info
                    $scope.elementSaving = true;
                    var docOb = {
                        id: viewOrDocOb.id, 
                        _projectId: viewOrDocOb._projectId, 
                        _refId: viewOrDocOb._refId,
                        _printCss: $scope.customizeDoc.customCSS
                    };
                    ElementService.updateElement(docOb).then(function() {
                        $scope.elementSaving = false;
                        growl.success('Save Successful');
                    }, function() {
                        $scope.elementSaving = false;
                        growl.warning('Save was not complete. Please try again.');
                    });
                };
                $scope.preview = function() {
                    if (!$scope.previewResult) {
                        $scope.previewResult = printOrGenerate(viewOrDocOb, 3, true, true, false);
                        $scope.previewResult.tof = $scope.previewResult.tof + $scope.previewResult.toe;
                    }
                    var result = $scope.previewResult;
                    var htmlArr = ['<html><head><title>' + viewOrDocOb.name + '</title><style type="text/css">', $scope.customizeDoc.customCSS, '</style></head><body style="overflow: auto">', result.cover];
                    if (result.toc != '') htmlArr.push(result.toc);
                    if (result.tot != '' && $scope.model.genTotf) htmlArr.push(result.tot);
                    if (result.tof != '' && $scope.model.genTotf) htmlArr.push(result.tof);
                    htmlArr.push(result.contents, '</body></html>');
                    var htmlString = htmlArr.join('');
                    var popupWin = $window.open('about:blank', '_blank', 'width=800,height=600,scrollbars=1,status=1,toolbar=1,menubar=1');
                    popupWin.document.open();
                    popupWin.document.write(htmlString);
                    popupWin.document.close();
                };
                $scope.print = function() {
                    $scope.customization = $scope.customizeDoc.useCustomStyle ? $scope.customizeDoc.customCSS : false;
                    $uibModalInstance.close(['ok', $scope.model.genTotf, $scope.model.htmlTotf, $scope.model.landscape, $scope.meta, $scope.customization]);
                };
                $scope.fulldoc = function() {
                    $uibModalInstance.close(['fulldoc']);
                };
                $scope.cancel = function() {
                    $uibModalInstance.dismiss();
                };
            }],
            backdrop: 'static',
            keyboard: false
        });
        /* choice:
        ['ok', $scope.model.genTotf, $scope.model.htmlTotf, $scope.model.landscape, $scope.meta]
        [0] 'ok' - modal button to confirm print/export
        [1] Generate List of Tables and Figures option
        [2] HTML option checked - used to generate ToC from html
        [3] Landscape option
        [4] metadata:
            bottom, bottom-left, bottom-right, top, top-left, top-right
        [5] customization: CSS String || false
        */
        modalInstance.result.then(function(choice) {
            if (choice[0] === 'ok') {
                var result = printOrGenerate(viewOrDocOb, mode, isDoc, choice[1], choice[2]);
                var customization = choice[5];
                var css = customization ? customization : UtilsService.getPrintCss(choice[2], choice[3], choice[4]);
                result.toe = choice[2] ? '' : result.toe;
                if (mode === 1) {
                    var popupWin = $window.open('about:blank', '_blank', 'width=800,height=600,scrollbars=1,status=1,toolbar=1,menubar=1');
                    popupWin.document.open();
                    popupWin.document.write('<html><head><title>' + viewOrDocOb.name + '</title><style type="text/css">' + css + '</style></head><body style="overflow: auto">' + result.cover + result.toc + result.tot + result.tof + result.toe + result.contents + '</body></html>');
                    popupWin.document.close();
                    $timeout(function() {
                        popupWin.print();
                    }, 1000, false);
                } else {
                    result.tof = choice[1] ? result.tof + result.toe : '';
                    result.tot = choice[1] ? result.tot : '';
                    var htmlArr = ['<html><head><title>' + viewOrDocOb.name + '</title><style type="text/css">', css, '</style></head><body>', result.cover];
                    if (result.toc != '') htmlArr.push(result.toc);
                    if (result.tot != '') htmlArr.push(result.tot);
                    if (result.tof != '') htmlArr.push(result.tof);
                    htmlArr.push(result.contents, '</body></html>');
                    var htmlString = htmlArr.join('');
                    UtilsService.exportHtmlAs(mode, {htmlString: htmlString, name: viewOrDocOb.name, projectId: viewOrDocOb._projectId, refId: viewOrDocOb._refId, css: css})
                        .then(function(result) {
                            deferred.resolve(result);
                        }, function(reason){
                            deferred.reject(reason);
                        });
                }
            } else {
                $rootScope.ve_fullDocMode = true;
                bbApi.setToggleState('tree-full-document', true, $rootScope.ve_tree_pane.buttons);
                $state.go('project.ref.document.full', {search: undefined});
            }
        });
        return deferred.promise;
    };


    /**
     * @ngdoc method
     * @name mmsApp.MmsAppUtils#printOrGenerate
     * @methodOf mmsApp.MmsAppUtils
     *
     * @description
     * Called by printModal to handle cleanup and building content needed for 
     * print, PDF or word export.
     * Cleansup html i.e. removes no-print, ng-hide
     *
     * @param {Object} viewOrDocOb current document or view object
     * @param {Number} mode 1 = print, 2 = word, 3 = pdf
     * @param {Boolean} isDoc viewOrDocOb is view or doc
     * @param {Boolean} genTotf whether to gen table of figures and tables (option from the modal form)
     * @param {Boolean} htmlTotf include DocGen generated tables and rapid tables (option from the modal form)
     * @returns {Object} Returns object with content needed for print/word export/PDF generation
     * <pre>
     * {
     *      cover: cover page html,
     *      contents: main content html,
     *      toc: table of contents html,
     *      tof: table of figures html,
     *      tot: table of tables html,
     *      toe: table of equations html
     * }
     * </pre>
     */
    var printOrGenerate = function(viewOrDocOb, mode, isDoc, genTotf, htmlTotf) {
        var printContents = '';
        var printElementCopy = angular.element("#print-div");

        // Conversion of canvas to its dataUrl must be done before "clone", because "clone" doesn't preserve
        // canvas' content
        var mapping = storeTomsawyerDiagramAsImg(printElementCopy);
        printElementCopy = printElementCopy.clone();
        replaceMmsTsDiagramWithImg(printElementCopy, mapping);

        var hostname = $location.host();
        var port = $location.port();
        var protocol = $location.protocol();
        var absurl = $location.absUrl();
        var prefix = protocol + '://' + hostname + ((port == 80 || port == 443) ? '' : (':' + port));
        var mmsIndex = absurl.indexOf('mms.html');
        var toc = UtilsService.makeHtmlTOC($rootScope.ve_treeApi.get_rows());

        // Conver to proper links for word/pdf
        UtilsService.convertViewLinks(printElementCopy);

        // Get correct table/image numbering based on doc hierarchy
        var tableAndFigTOC = UtilsService.makeTablesAndFiguresTOC($rootScope.ve_treeApi.get_rows(), printElementCopy, false, htmlTotf);
        var tof = tableAndFigTOC.figures;
        var tot = tableAndFigTOC.tables;
        var toe = tableAndFigTOC.equations;

        // Customize TOC based on user choice
        if (!isDoc) {
            toc = tof = tot = toe = '';
        }
        if (!genTotf) {
            tof = tot = toe = '';
        }
        angular.element(printElementCopy).find("a").attr('href', function(index, old) {
            if (!old)
                return old;
            if (old.indexOf('/') === 0)
                return prefix + old;
            if (old.indexOf('../../') === 0)
                return prefix + old.substring(5);
            if (old.indexOf('../') === 0)
                return prefix + '/alfresco' + old.substring(2);
            if (old.indexOf('mms.html') === 0)
                return absurl.substring(0, mmsIndex) + old;
            return old;
        });

        // Remove comments, table features, and all elements with classes: mms-error, no-print, ng-hide
        printElementCopy.find('mms-transclude-com').remove();
        printElementCopy.find('style').remove(); //prevent user inserted styles from interfering
        printElementCopy.find('div.tableSearch').remove();
        //printElementCopy.find('.mms-error').html('error');
        printElementCopy.find('.no-print').remove();
        printElementCopy.find('.ng-hide').remove();

        // word doesn't support svg only png.
        if (mode === 2) {
            printElementCopy.find('.mms-svg').remove();
        } else {
            printElementCopy.find('.mms-png').remove();
        }
        // Remove all empty paragraphs
        printElementCopy.find('p:empty').remove();
        printElementCopy.find('p').each(function() {
            var $this = $(this);
            if ($this.html().replace(/\s|&nbsp;/g, '').length === 0) {
                $this.remove();
            }
        });
        printElementCopy.find('[width]').not('img').not('.ve-fixed-width').removeAttr('width');
        printElementCopy.find('[style]').not('hr').each(function() {
            this.style.removeProperty('font-size');
            this.style.removeProperty('width');
            this.style.removeProperty('min-width');
            this.style.removeProperty('height');
            //remove frozen headers and column
            this.style.removeProperty('transform');
            this.style.removeProperty('will-change');
        });
        printElementCopy.find('.math').remove(); //this won't work in chrome for popups since chrome can't display mathml
        printElementCopy.find('script').remove();
        //printElementCopy.find('.MJX_Assistive_MathML').remove(); //pdf generation need mathml version

        // Get doc cover page by doc ID
        var coverHtml = '';
        if (isDoc) {
            var cover = printElementCopy.find("mms-view[mms-element-id='" + viewOrDocOb.id + "']");
            cover.remove();
            // Add class to style cover page
            cover.addClass('ve-cover-page');
            coverHtml = cover[0].outerHTML;
        }
        printContents = printElementCopy[0].outerHTML;

        return { cover: coverHtml, contents: printContents, toc: toc, tof: tof, tot: tot, toe: toe };
    };

    var handleChildViews = function(v, aggr, propId, projectId, refId, curItemFunc, childrenFunc, seen) {
        var seenViews = seen;
        if (!seenViews)
            seenViews = {};
        var deferred = $q.defer();
        var curItem = curItemFunc(v, aggr, propId);
        seenViews[v.id] = v;
        var childIds = [];
        var childAggrs = [];
        var childPropIds = [];
        if (!v._childViews || v._childViews.length === 0 || aggr === 'none') {
            if (angular.isObject(curItem) && curItem.loading) {
                curItem.loading = false;
            }
            deferred.resolve(curItem);
            return deferred.promise;
        }
        for (var i = 0; i < v._childViews.length; i++) {
            if (seenViews[v._childViews[i].id])
                continue;
            childIds.push(v._childViews[i].id);
            childAggrs.push(v._childViews[i].aggregation);
            childPropIds.push(v._childViews[i].propertyId);
        }
        ElementService.getElements({
            elementIds: childIds,
            projectId: projectId,
            refId: refId
        }, 2).then(function(childViews) {
            var mapping = {};
            for (var i = 0; i < childViews.length; i++) {
                mapping[childViews[i].id] = childViews[i];
            }
            var childPromises = [];
            var childNodes = [];
            var processedChildViews = [];
            for (i = 0; i < childIds.length; i++) {
                var child = mapping[childIds[i]];
                if (child && UtilsService.isView(child)) { //what if not found??
                    childPromises.push(handleChildViews(child, childAggrs[i], childPropIds[i], projectId, refId, curItemFunc, childrenFunc, seenViews));
                    childNodes.push(curItemFunc(child, childAggrs[i], childPropIds[i]));
                    processedChildViews.push({id: child.id, aggregation: childAggrs[i], propertyId: childPropIds[i]});
                }
            }
            v._childViews = processedChildViews;
            childrenFunc(curItem, childNodes);
            $q.all(childPromises).then(function(childNodes) {
                deferred.resolve(curItem);
            }, function(reason) {
                deferred.reject(reason);
            });
        }, function(reason) {
            deferred.reject(reason);
        });
        return deferred.promise;
    };

    var refreshNumbering = function(tree, centerElement) {
        UtilsService.makeTablesAndFiguresTOC(tree, centerElement, true, false);
    };

    /** Store all tomsawyer diagram(canvas) as an img element **/
    function storeTomsawyerDiagramAsImg(originalDom) {
        var mapping = {};
        originalDom.find('mms-ts-diagram').each(function(index){
            var tsDom = $(this);
            var canvas = tsDom.find('canvas')[0];
            if(canvas) {
                var imgElement = $('<img>');
                imgElement.attr({'src': canvas.toDataURL(), 'width': '100%' });
                mapping[index] = imgElement;
            }
        });
        return mapping;
    }

    /** Replace all mms-ts-diagram elements with their corresponding img elements **/
    function replaceMmsTsDiagramWithImg(element, mapping) {
        element.find('mms-ts-diagram').each(function(index) {
           var imgDom = mapping[index];
           $(this).replaceWith(imgDom);
        });
    }

    return {
        printModal: printModal,
        tableToCsv: tableToCsv,
        handleChildViews: handleChildViews,
        refreshNumbering: refreshNumbering
    };
}

