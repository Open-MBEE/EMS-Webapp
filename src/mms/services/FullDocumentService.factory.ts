import * as angular from 'angular'
var mms = angular.module('mms');

mms.factory('FullDocumentService', ['$timeout', "$interval", '$http', '_', 'growl', FullDocumentService]);

function FullDocumentService($timeout, $interval, $http, _, growl) {
    return function (views) {
        var self = this;
        // public api
        this.viewsBuffer = [];
        this.handleClickOnBranch = handleClickOnBranch;
        this.loadRemainingViews = loadRemainingViews;
        this.handleDocumentScrolling = handleDocumentScrolling;
        this.addInitialViews = addInitialViews;
        this.handleViewAdd = handleViewAdd;
        this.handleViewDelete = handleViewDelete;

        // internal states
        this._views = views;
        this._isLoadingRemaingViews = false;
        this._isFullDocFullyLoaded = false;

        function handleClickOnBranch(branch, callback) {
            var viewId = branch.type === 'view' ? branch.data.id : branch.viewId;
            var isViewLoadedBefore =_loadViewsUntilViewWith(viewId); // load some views if necessary
            if (isViewLoadedBefore) {
                callback();
            } else {
                var message = growl.info('Loading more views!', {ttl: -1});
                _waitTillAfterDigestCycle(function() { // wait for digest to finish and for content to finish rendering
                    message.destroy();
                    callback();
                });
            }
            return isViewLoadedBefore;
        }

        function loadRemainingViews(callback) {
            if (self._isFullDocFullyLoaded) {
                callback();
            } else {
                var handler;
                if (!self._loadingRemainingViewsMessage) {
                    self._loadingRemainingViewsMessage = growl.info('Loading more views!', { ttl: -1, onclose: function() { delete self._loadingRemainingViewsMessage; } } );
                }
                if (!self._isLoadingRemaingViews) {
                    self._isLoadingRemaingViews = true;
                    handler = $interval(function() {
                        var nextIndex = self.viewsBuffer.length + 9;
                        if (nextIndex >= self._views.length) {
                            nextIndex = self._views.length - 1;
                        }
                        _pushNewViewsToBuffer(self.viewsBuffer.length, nextIndex);
                        if (nextIndex === self._views.length - 1) {
                            $interval.cancel(handler);
                            _waitTillAfterDigestCycle(function() {
                                callback();
                                self._isLoadingRemaingViews = false;
                                if (self._loadingRemainingViewsMessage) {
                                    self._loadingRemainingViewsMessage.destroy();
                                    delete self._loadingRemainingViewsMessage;
                                }
                            });
                        }
                    }, 1000);
                }
            }
        }

        function handleDocumentScrolling() {
            return _pushNewViewsToBuffer(self.viewsBuffer.length, self.viewsBuffer.length);
        }

        function addInitialViews(isScrollbarVisible) {
            var message = growl.info('Loading initial view!', {ttl: -1});
            _incrementallyAddViewTillScroll(message.destroy, isScrollbarVisible);
        }

        function handleViewAdd(view, prevSiblingViewId) {
            // load the new view into the original views right after its sibling
            var siblingIndex = _findViewFromOriginalViews(prevSiblingViewId);
            self._views.splice(siblingIndex + 1, 0, view);

            // load the new view into the viewsBuffer
            var siblingIndexFromLoadedViews = _findViewFromLoadedViews(prevSiblingViewId);
            if (siblingIndexFromLoadedViews === -1) {
                // load all views up until the sibling view plus the new view
                _pushNewViewsToBuffer(self.viewsBuffer.length, siblingIndex + 1);
            } else {
                // load the new view right after its sibling
                _addNewViewToBufferAt(siblingIndexFromLoadedViews + 1);
            }
        }

        function handleViewDelete(deletedBranch) {
            var viewIdsToDelete = [];
            _getAllViewsStartingAt(deletedBranch, viewIdsToDelete);
            _deleteViewsFrom(self._views, viewIdsToDelete);
            _deleteViewsFrom(self.viewsBuffer, viewIdsToDelete);
        }

        function _addNewViewToBufferAt(index) {
            self.viewsBuffer.splice(index, 0, self._views[index]);
        }

        function _pushNewViewsToBuffer(startIndex, endIndex) {
            var isLoadedBefore = true;
            if (startIndex < self._views.length && endIndex < self._views.length) {
                Array.prototype.push.apply(self.viewsBuffer, self._views.slice(startIndex, endIndex + 1));
                isLoadedBefore = false;
                if (endIndex === self._views.length - 1) {
                    _waitTillAfterDigestCycle(function() {
                        self._isFullDocFullyLoaded = true;
                    });
                }
            }
            return isLoadedBefore;
        }

        function _loadViewsUntilViewWith(viewId) {
            var isViewLoadedBefore = true;
            // if not, find the index of that view and load starting from lastLoadedViewIndex till that view + 1
            if (_findViewFromLoadedViews(viewId) === -1) {
                var index = _findViewFromOriginalViews(viewId);
                if (index !== -1) {
                    _pushNewViewsToBuffer(self.viewsBuffer.length, index);
                }
                isViewLoadedBefore = false;
            }
            return isViewLoadedBefore;
        }

        function _incrementallyAddViewTillScroll(callback, isScrollbarVisible) {
            var isNoMoreToLoad = _pushNewViewsToBuffer(self.viewsBuffer.length, self.viewsBuffer.length);
            _waitTillAfterDigestCycle(function() {
                var isScrollBarVisible = isScrollbarVisible();
                if (isScrollBarVisible || isNoMoreToLoad) {
                    callback();
                } else {
                    _incrementallyAddViewTillScroll(callback, isScrollbarVisible);
                }
            });
        }

        function _getAllViewsStartingAt(branch, results) {
            if (branch.type === 'view') {
                results.push(branch.data.id);
                branch.children.forEach(function(childBranch) {
                    _getAllViewsStartingAt(childBranch, results);
                });
            }
        }

        function _deleteViewsFrom(viewListToDeleteFrom, viewIdsToDelete) {
            _.remove(viewListToDeleteFrom, function(view) {
                return viewIdsToDelete.indexOf(view.id) !== -1;
            });
        }

        function _findViewFromLoadedViews(viewId) {
            return _.findIndex(self.viewsBuffer, {id: viewId});
        }

        function _findViewFromOriginalViews(viewId) {
            return _.findIndex(self._views, {id: viewId});
        }

        function _waitTillAfterDigestCycle(callback) {
            $timeout(function() {
                if (_isViewsFullyLoaded()) {
                    callback();
                } else {
                    _waitTillAfterDigestCycle(callback);
                }
            }, 500);
        }

        function _isViewsFullyLoaded() {
            return $http.pendingRequests.length === 0;
        }
    };
}