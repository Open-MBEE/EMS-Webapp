import * as angular from "angular";
var mmsDirectives = angular.module('mmsDirectives');

mmsDirectives.directive('mmsCkeditor', ['$uibModal', '$templateCache', '$timeout', 'growl', 'CKEDITOR', '_', 'CacheService', 'ElementService', 'UtilsService', 'ViewService', 'URLService', 'MentionService', 'Utils', mmsCkeditor]);

/**
 * @ngdoc directive
 * @name mmsDirectives.directive:mmsCkeditor
 * @element textarea
 *
 * @requires mms.CacheService
 * @requires mms.ElementService
 * @requires mms.UtilsService
 * @requires mms.ViewService
 * @requires $uibModal
 * @requires $templateCache
 * @requires $window
 * @requires $timeout
 * @requires growl
 * @requires CKEDITOR
 * @requires _
 *
 * @restrict A
 *
 * @description
 * Make any textarea with an ngModel attached to be a CKEditor wysiwyg editor. This
 * requires the CKEditor library. Transclusion is supported. ngModel is required.
 * ### Example
 * <pre>
   <textarea mms-ckeditor ng-model="element.documentation"></textarea>
   </pre>
 */
function mmsCkeditor($uibModal, $templateCache, $timeout, growl, CKEDITOR, _, CacheService, ElementService, UtilsService, ViewService, URLService, MentionService, Utils) { //depends on angular bootstrap
    var generatedIds = 0;

    var mmsCkeditorLink = function(scope, element, attrs, ngModelCtrl) {
        if (!attrs.id) {
            attrs.$set('id', 'mmsCkEditor' + generatedIds++);
        }

        var instance = null;
        var transcludeModalTemplate = 'partials/mms-directives/mmsCfModal.html';
        var commentModalTemplate = 'partials/mms-directives/mmsCommentModal.html';

        // Controller for inserting cross reference
        // Defines scope variables for html template and how to handle user click
        // Also defines options for search interfaces -- see mmsSearch.js for more info
        var transcludeCtrl = function($scope, $uibModalInstance) {
            $scope.title = 'Insert cross reference';
            $scope.description = 'Begin by searching for an element, then click a field to cross-reference.';
            $scope.searchExisting = true;
            $scope.newE = {name: '', documentation: ''};
            $scope.requestName = false;
            $scope.requestDocumentation = false;
            $scope.showProposeLink = true;
            $scope.nonEditableCheckbox = false;
            $scope.showEditableOp = true;
            $scope.choose = function(elem, property) {
                var tag = '<mms-cf mms-cf-type="' + property + '" mms-element-id="' + elem.id + '" non-editable="' + $scope.nonEditableCheckbox + '">[cf:' + elem.name + '.' + property + ']</mms-cf>';
                $uibModalInstance.close(tag);
            };
            $scope.cancel = function() {
                $uibModalInstance.dismiss();
            };

             // Set search result options
            $scope.searchOptions= {};
            $scope.searchOptions.getProperties = true;
            $scope.searchOptions.callback = $scope.choose;
            $scope.searchOptions.emptyDocTxt = 'This field is empty, but you can still click here to cross-reference a placeholder.';

            $scope.makeNewAndChoose = function() {
                if (!$scope.newE.name) {
                    growl.error('Error: A name for your new element is required.');
                    return;
                } else if (!$scope.requestName && !$scope.requestDocumentation) {
                    growl.error('Error: Selection of a property to cross-reference is required.');
                    return;
                }
                $scope.proposeClass = "fa fa-spin fa-spinner";
                var id = UtilsService.createMmsId();
                var toCreate = {
                    id: id,
                    ownerId: "holding_bin_" + scope.mmsProjectId,
                    name: $scope.newE.name,
                    documentation: $scope.newE.documentation,
                    type: 'Class',
                    _appliedStereotypeIds: []
                };
                toCreate = UtilsService.createClassElement(toCreate);
                var reqOb = {element: toCreate, projectId: scope.mmsProjectId, refId: scope.mmsRefId};

                ElementService.createElement(reqOb)
                .then(function(data) {
                    if ($scope.requestName) {
                        $scope.choose(data, 'name');
                    } else if ($scope.requestDocumentation) {
                        $scope.choose(data, 'doc');
                    }
                    $scope.proposeClass = "";
                }, function(reason) {
                    growl.error("Propose Error: " + reason.message);
                    $scope.proposeClass = "";
                });
            };
            $scope.toggleRadio = function(field) {
                if (field === "name") {
                    $scope.requestName = true;
                    $scope.requestDocumentation = false;
                } else if (field === "documentation") {
                    $scope.requestName = false;
                    $scope.requestDocumentation = true;
                }
            };
        };

        var transcludeCallback = function(ed) {
            var instance = $uibModal.open({
                template: transcludeModalTemplate,
                scope: scope,
                controller: ['$scope', '$uibModalInstance', transcludeCtrl],
                size: 'lg'
            });
            instance.result.then(function(tag) {
                _addWidgetTag(ed, tag);
            }, function() {
                var focusManager = new CKEDITOR.focusManager( ed );
                focusManager.focus();
            });
        };

        // Controller for inserting view link
        // Defines scope variables for html template and how to handle user click
        // If user selects name or doc, link will be to first related doc
        // Also defines options for search interfaces -- see mmsSearch.js for more info
        var transcludeViewLinkCtrl = function($scope, $uibModalInstance, ApplicationService) {
            $scope.title = 'Insert cross reference as link';
            $scope.description = 'Search for a view or content element, click on its name or its document/section to insert link.';
            $scope.showProposeLink = false;
            $scope.searchExisting = true;
            $scope.suppressNumbering = false;
            $scope.suppressName = true;
            $scope.linkType = 1;
            $scope.linkText = '';

            // Function to construct view link
            var createViewLink = function (elem, did, vid, peid) {
                var tag = '<mms-view-link';
                if (did) {
                    tag += ' mms-doc-id="' + did + '"';
                }
                if (vid) {
                    tag += ' mms-element-id="' + vid + '"';
                }
                if (peid) {
                    tag += ' mms-pe-id="' + peid + '"';
                }
                if ($scope.linkType == 1) {
                    tag += ' suppress-numbering="false"';
                    tag += ' show-name="false"';
                }
                if ($scope.linkType == 2) {
                    tag += ' suppress-numbering="true"';
                    tag += ' show-name="true"';
                }
                if ($scope.linkType == 3 && $scope.linkText) {
                    tag += ' link-text="' + $scope.linkText + '"';
                }
                if ($scope.linkType == 4) {
                    tag += ' suppress-numbering="false"';
                    tag += ' show-name="true"';
                }
                tag += '>[cf:' + elem.name + '.vlink]</mms-view-link>';
                return tag;
            };

            $scope.choose = function(elem) {
                var did = null;
                var vid = null;
                var peid = null;
                var currentDoc = ApplicationService.getState().currentDoc;
                if (elem._relatedDocuments && elem._relatedDocuments.length > 0) {
                    var cur = _.find(elem._relatedDocuments, {id: currentDoc});
                    if (cur) {
                        did = currentDoc;
                        if (cur._parentViews.length > 0) {
                            vid = cur._parentViews[0].id;
                        }
                    } else {
                        did = elem._relatedDocuments[0].id;
                        if (elem._relatedDocuments[0]._parentViews.length > 0) {
                            vid = elem._relatedDocuments[0]._parentViews[0].id;
                        }
                    }
                }
                if (elem.type === 'InstanceSpecification') {
                    if (ViewService.isSection(elem)) {
                        vid = elem.id;
                    } else {
                        peid = elem.id;
                    }
                } else {
                    vid = elem.id;
                }
                var tag = createViewLink(elem, did, vid, peid);
                $uibModalInstance.close(tag);
            };
            $scope.chooseDoc = function(doc, view, elem) {
                var did = doc.id;
                var vid = view.id;
                var peid = null;
                if (ViewService.isSection(elem)) {
                    vid = elem.id;
                } else if (ViewService.getPresentationElementType(elem)) {
                    peid = elem.id;
                }
                var tag = createViewLink(elem, did, vid, peid);
                $uibModalInstance.close(tag);
            };
            $scope.cancel = function() {
                $uibModalInstance.dismiss();
            };

            var mainSearchFilter = function() {
                var stereoQuery = {
                    terms: {}
                };
                stereoQuery.terms = {"_appliedStereotypeIds": [UtilsService.VIEW_SID, UtilsService.DOCUMENT_SID].concat(UtilsService.OTHER_VIEW_SID)};

                var classifierList = [];
                var allClassifierIds = ViewService.TYPE_TO_CLASSIFIER_ID;
                for (var k in allClassifierIds) {
                    if (allClassifierIds.hasOwnProperty(k)) {
                        classifierList.push(allClassifierIds[k]);
                    }
                }
                var classifierIdQuery = {
                    terms: {}
                };
                classifierIdQuery.terms = {"classifierIds": classifierList};
                return {
                    "bool": {
                        "should": [
                            stereoQuery,
                            classifierIdQuery
                        ]
                    }
                };
            };

            $scope.searchOptions = {
                callback: $scope.choose,
                relatedCallback: $scope.chooseDoc,
                filterQueryList: [mainSearchFilter],
                itemsPerPage: 200
            };
        };

        var viewLinkCallback = function(ed) {
            var instance = $uibModal.open({
                template: transcludeModalTemplate,
                scope: scope,
                controller: ['$scope', '$uibModalInstance', 'ApplicationService', transcludeViewLinkCtrl],
                size: 'lg'
            });
            instance.result.then(function(tag) {
                _addWidgetTag(ed, tag);
            });
        };

        var commentCtrl = function($scope, $uibModalInstance) {
            var id = UtilsService.createMmsId();
            $scope.comment = UtilsService.createClassElement({
                id: id,
                name: 'Comment ' + new Date().toISOString(),
                documentation: '',
                type: 'Class',
                ownerId: "holding_bin_" + scope.mmsProjectId,
                _appliedStereotypeIds: []
            });
            $scope.oking = false;
            $scope.ok = function() {
                if ($scope.oking) {
                    growl.info("Please wait...");
                    return;
                }
                $scope.oking = true;
                var reqOb = {element: $scope.comment, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
                ElementService.createElement(reqOb)
                .then(function(data) {
                    var tag = '<mms-cf mms-cf-type="com" mms-element-id="' + data.id + '">comment:' + data._creator + '</mms-cf>';
                    $uibModalInstance.close(tag);
                }, function(reason) {
                    growl.error("Comment Error: " + reason.message);
                }).finally(function() {
                    $scope.oking = false;
                });
            };
            $scope.cancel = function() {
                $uibModalInstance.dismiss();
            };
        };

        var commentCallback = function(ed) {
            var instance = $uibModal.open({
                template: commentModalTemplate,
                scope: scope,
                controller: ['$scope', '$uibModalInstance', commentCtrl]
            });
            instance.result.then(function(tag) {
                _addWidgetTag(ed, tag);
            });
        };

        var resetCrossRef = function(type, typeString) {
            angular.forEach(type, function(value, key) {
                var transclusionObject = angular.element(value);
                var transclusionId = transclusionObject.attr('mms-element-id');
                var transclusionKey = UtilsService.makeElementKey({id: transclusionId, _projectId: scope.mmsProjectId, _refId: scope.mmsRefId});
                var inCache = CacheService.get(transclusionKey);
                if (inCache) {
                    transclusionObject.html('[cf:' + inCache.name + typeString);
                } else {
                    //TODO create Utils function to handle request objects
                    var reqOb = {elementId: transclusionId, projectId: scope.mmsProjectId, refId: scope.mmsRefId};
                    ElementService.getElement(reqOb, 2)
                    .then(function(data) {
                        transclusionObject.html('[cf:' + data.name + typeString);
                    }, function(reason) {
                        var error;
                        if (reason.status === 410)
                            error = 'deleted';
                        if (reason.status === 404)
                            error = 'not found';
                        transclusionObject.html('[cf:' + error + typeString);
                    });
                }
            });
        };

        var mmsResetCallback = function(ed) {
            var body = ed.document.getBody();
            resetCrossRef(body.find("mms-cf[mms-cf-type='name']").$, '.name]');
            resetCrossRef(body.find("mms-cf[mms-cf-type='doc']").$, '.doc]');
            resetCrossRef(body.find("mms-cf[mms-cf-type='val']").$, '.val]');
            resetCrossRef(body.find('mms-view-link').$, '.vlink]');
            update();
        };

        var update = function() {
            // getData() returns CKEditor's processed/clean HTML content.
            if (angular.isDefined(instance) && instance !== null)
                ngModelCtrl.$setViewValue(instance.getData());
        };
        
        // Formatting editor toolbar
        var stylesToolbar = { name: 'styles', items : ['Styles',/*'Format',*/'FontSize','TextColor','BGColor'] };
        var basicStylesToolbar = { name: 'basicstyles', items : [ 'Bold','Italic','Underline', 'mmsExtraFormat'] };
        var clipboardToolbar = { name: 'clipboard', items : [ 'Undo','Redo' ] };
        var justifyToolbar = { name: 'paragraph', items : [ 'JustifyLeft','JustifyCenter','JustifyRight' ] };
        var editingToolbar = { name: 'editing', items : [ 'Find','Replace' ] };
        var linksToolbar = { name: 'links', items : [ 'Link','Unlink','-' ] };
        var imageToolbar = { name: 'image', items: [ 'Image','Iframe' ] };
        var listToolbar =  { name: 'list', items: [ 'NumberedList','BulletedList','Outdent','Indent' ] };
        var equationToolbar = { name: 'equation', items: [ 'Mathjax','SpecialChar' ]};
        var sourceToolbar = { name: 'source', items: [ 'Maximize','Sourcedialog' ] };
        var combinedToolbar = { name: 'combined', items: [{name: 'Mmscf', label: 'Cross Reference', command: 'mmscf'},
            {name: 'Mmsvlink',label: 'View/Element Link',command: 'mmsvlink'}, 'Table', 'Image', 'Iframe', 'Mathjax', 'SpecialChar', {name: 'Mmscomment',label: 'Comment',   command: 'mmscomment'}, 'mmsExtraFeature' ]};
        // var tableEquationToolbar = { name: 'tableEquation', items: ['Table', 'Mathjax', 'SpecialChar', '-']};

        var thisToolbar = [stylesToolbar, basicStylesToolbar, justifyToolbar, listToolbar, linksToolbar, combinedToolbar, clipboardToolbar, editingToolbar, sourceToolbar];
        switch(scope.mmsEditorType) {
            case 'TableT':
                //thisToolbar = [stylesToolbar, basicStylesToolbar, justifyToolbar, linksToolbar, tableEquationToolbar, dropdownToolbar, clipboardToolbar, editingToolbar, sourceToolbar];
                break;
            case 'ListT':
                // @ts-ignore
                // TODO: Figure out why this doesnt work in typescript or how to make it work
                thisToolbar = [stylesToolbar, basicStylesToolbar, justifyToolbar, listToolbar, linksToolbar, equationToolbar, 'mmsExtraFeature', clipboardToolbar, editingToolbar, sourceToolbar];
                break;
            case 'Equation':
                thisToolbar = [justifyToolbar, equationToolbar, sourceToolbar];
                break;
            case 'Figure':
            case 'ImageT':
                thisToolbar = [justifyToolbar, imageToolbar, sourceToolbar];
                break;
        }

        var deb = _.debounce(function(e) {
            update();
        }, 1000);

        $timeout(function() {
            // Initialize ckeditor and set event handlers
            $(element).val(ngModelCtrl.$modelValue);
            instance = CKEDITOR.replace(attrs.id, {
                customConfig: '/lib/ckeditor/config.js',
                mmscf: {callbackModalFnc: transcludeCallback},
                mmscomment: {callbackModalFnc: commentCallback},
                mmsvlink: {callbackModalFnc: viewLinkCallback},
                mmsreset: {callback: mmsResetCallback},
                contentsCss: CKEDITOR.basePath+'contents.css',
                toolbar: thisToolbar
            });

            // Enable Autosave plugin only when provided with unique identifier (autosaveKey)
            if ( attrs.autosaveKey ) {
                // Configuration for autosave plugin
                instance.config.autosave = {
                    SaveKey: attrs.autosaveKey,
                    delay: 5,
                    NotOlderThen: 7200, // 5 days in minutes
                    enableAutosave: true
                };
            } else {
                instance.config.autosave = {enableAutosave: false};
            }

            instance.on( 'instanceReady', function() {
                addCkeditorHtmlFilterRule(instance);
                _addContextMenuItems(instance);
                highlightActiveEditor(instance);
            } );

            function highlightActiveEditor(instance) {
                var activeEditorClass = 'active-editor';
                $('mms-transclude-doc').children('div').removeClass(activeEditorClass);
                $(instance.element.$).closest('mms-transclude-doc').children('div').addClass(activeEditorClass);

                instance.on('focus', function() {
                    $('mms-transclude-doc').children('div').removeClass(activeEditorClass);
                    $(instance.element.$).closest('mms-transclude-doc').children('div').addClass(activeEditorClass);
                });
            }

            function addCkeditorHtmlFilterRule(instance) {
                instance.dataProcessor.htmlFilter.addRules({
                    elements: {
                        $: function (element) {
                            if (element.name === 'script') {
                                element.remove();
                                return;
                            }
                            
                            if (element.name.startsWith('mms-')) {
                                if (element.name !== 'mms-view-link' && element.name !== 'mms-cf' && element.name !== 'mms-group-docs' && element.name !== 'mms-diff-attr' && element.name !== 'mms-value-link') {
                                    element.replaceWithChildren();
                                    return;
                                }
                            }

                            var attributesToDelete = Object.keys(element.attributes).filter(function(attrKey) {
                                return attrKey.startsWith('ng-');
                            });
                            attributesToDelete.forEach(function(attrToDelete) {
                                delete element.attributes[attrToDelete];
                            });
                        }
                    }
                });
                instance.dataProcessor.dataFilter.addRules({
                    elements: {
                        $: function (element) {
                            if (element.name === 'script') {
                                element.remove();
                                return;
                            }

                            if (element.name.startsWith('mms-')) {
                                if (element.name !== 'mms-view-link' && element.name !== 'mms-cf' && element.name !== 'mms-group-docs' && element.name !== 'mms-diff-attr' && element.name !== 'mms-value-link') {
                                    element.replaceWithChildren();
                                    return;
                                }
                            }

                            var attributesToDelete = Object.keys(element.attributes).filter(function(attrKey) {
                                return attrKey.startsWith('ng-');
                            });
                            attributesToDelete.forEach(function(attrToDelete) {
                                delete element.attributes[attrToDelete];
                            });
                        }
                    }
                });
            }

            instance.on( 'init', function(args) {
                ngModelCtrl.$setPristine();
            });

            instance.on( 'change', deb);
            instance.on( 'afterCommandExec', deb);
            instance.on( 'resize', deb);
            instance.on( 'destroy', deb);
            instance.on( 'blur', function(e) {
                instance.focusManager.blur();
            });
            instance.on( 'key', _keyHandler , null, null, 31); //priority is after indent list plugin's event handler

            _addInlineMention();

            if (scope.mmsEditorApi) {
                scope.mmsEditorApi.save = function() {
                    update();
                };
            }
            instance.on('fileUploadRequest', function(evt) {
                var fileLoader = evt.data.fileLoader;
                var formData = new FormData();
                var xhr = fileLoader.xhr;

                xhr.open( 'POST', URLService.getPutArtifactsURL({projectId: scope.mmsProjectId, refId: scope.mmsRefId}), true );
                formData.append('id', UtilsService.createMmsId().replace('MMS', 'VE'));
                formData.append('file', fileLoader.file, fileLoader.fileName );
                if (fileLoader.fileName) {
                    formData.append('name', fileLoader.fileName);
                }
                fileLoader.xhr.send( formData );

                // Prevented the default behavior.
                evt.stop();
            });
            instance.on( 'fileUploadResponse', function( evt ) {
                // Prevent the default response handler.
                evt.stop();
            
                // Get XHR and response.
                var data = evt.data;
                var xhr = data.fileLoader.xhr;
                var response = JSON.parse(xhr.response);
            
                if ( !response.artifacts || response.artifacts.length == 0) {
                    // An error occurred during upload.
                    //data.message = response[ 1 ];
                    evt.cancel();
                } else {
                    data.url = '/alfresco' + response.artifacts[0].artifactLocation;
                }
            } );
        }, 0, false);
        
        ngModelCtrl.$render = function() { //commenting out to see if it helps with cursors jumping problem without adverse effects
        //side effect is will not sync if editing in both right pane and center pane at the same time
            // if (!instance) {
            //     instance = CKEDITOR.instances[attrs.id];
            // } else {
            //     var ranges = instance.getSelection().getRanges();
            //     instance.setData(ngModelCtrl.$viewValue || '');
            //     instance.getSelection().selectRanges( ranges );
            // }
        };
        
        scope.$on('$destroy', function() {
            if (!instance) {
                instance = CKEDITOR.instances[attrs.id];
            } else {
                MentionService.removeAllMentionForEditor(instance);
                instance.destroy();
                instance = null;
            }
        });

        function _addWidgetTag(editor, tag) {
            editor.insertHtml( tag );
            Utils.focusOnEditorAfterAddingWidgetTag(editor);
        }

        function _addInlineMention() {
            var keyupHandler;
            CKEDITOR.instances[attrs.id].on('contentDom', function() {
                keyupHandler = CKEDITOR.instances[instance.name].document.on('keyup', function(e) {
                    if(_isMentionKey(e.data.$)) {
                        MentionService.createMention(instance, scope.mmsProjectId, scope.mmsRefId);
                    } else {
                        MentionService.handleInput(e, instance, scope.mmsProjectId, scope.mmsRefId);
                    }
                });
            });

            CKEDITOR.instances[attrs.id].on('contentDomUnload', function() {
                if (keyupHandler) {
                    keyupHandler.removeListener();
                }
            });
        }

        function _keyHandler(e) {
            if (_isMentionKey(e.data.domEvent.$)) {
                return false; // to prevent "@" from getting written to the editor
            }

            // when tab is pressed or any of these special keys is pressed while the mention results show up, ignore default ckeditor's behaviour
            var ignoreDefaultBehaviour = _isTabKey(e) || (_isSpecialKey(e) && MentionService.hasMentionResults(instance) );
            if ( ignoreDefaultBehaviour ) {
                e.cancel(); e.stop();
            }

            if (_isTabKey(e) && !_isShiftKeyOn(e.data.domEvent.$)) {
                instance.insertHtml('&nbsp;&nbsp;&nbsp;&nbsp;');
            }

            if (!ignoreDefaultBehaviour) {
                deb(e);
            }
        }

        // 13 = enter, 38 = up arrow, 40 = down arrow
        function _isSpecialKey(event) {
            var key = event.data.domEvent.$.which;
            return key === 13 || key === 38 || key === 40;
        }

        function _isTabKey(event) {
            return event.data.domEvent.$.which === 9;
        }

        function _isMentionKey(keyboardEvent) {
            return _isShiftKeyOn(keyboardEvent) && keyboardEvent.key === '@';
        }

        function _isShiftKeyOn(keyboardEvent) {
            return keyboardEvent.shiftKey;
        }

        function _addContextMenuItems(editor) {
            _addFormatAsCodeMenuItem(editor);
        }

        function _addFormatAsCodeMenuItem(editor) {
            editor.addCommand('formatAsCode', {
                exec: function (editor) {
                    var selected_text = editor.getSelection().getSelectedText();
                    var newElement = new CKEDITOR.dom.element("code");
                    newElement.addClass('inlineCode');
                    newElement.setText(selected_text);
                    editor.insertElement(newElement);
                }
            });
            editor.addMenuGroup('veGroup');
            editor.addMenuItem('formatAsCode', {
                label: 'Format as inline code',
                command: 'formatAsCode',
                group: 'veGroup',
                icon: 'codeSnippet'
            });
            editor.contextMenu.addListener(function (element) {
                return {formatAsCode: CKEDITOR.TRISTATE_OFF};
            });
            editor.setKeystroke( CKEDITOR.CTRL + 75, 'formatAsCode' );
        }
    };

    return {
        priority: 10,
        restrict: 'A',
        require: 'ngModel',
        scope: {
            mmsProjectId: '@',
            mmsRefId: '@',
            autosaveKey: '@',
            mmsEditorType: '@',
            mmsEditorApi: '<?'
        },
        link: mmsCkeditorLink
    };
}
