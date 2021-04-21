import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');



/* Controllers */

mmsApp.controller('ReorderCtrl', ['$scope', '$rootScope', 'documentOb', 'ElementService', 'ViewService', 'MmsAppUtils', '$state', 'growl', '$q', '_',
function($scope, $rootScope, documentOb, ElementService, ViewService, MmsAppUtils, $state, growl, $q, _) {
    $scope.doc = documentOb;

    var viewIds2node = {};
    var origViews = {};
    viewIds2node[documentOb.id] = {
        name: documentOb.name,
        id: documentOb.id,
        aggr: 'composite',
        children: []
    };

    var updateNumber = function(node, curSection, key) {
        node[key] = curSection;
        var num = 1;
        for (var i = 0; i < node.children.length; i++) {
            updateNumber(node.children[i], curSection + '.' + num, key);
            num++;
        }
    };

    $scope.treeOptions = {
        dropped : function() {
            for (var i = 0; i < $scope.tree.length; i++) {
                var root = $scope.tree[i];
                root.new = '';
                var num = 1;
                for (var j = 0; j < root.children.length; j++) {
                    updateNumber(root.children[j], num + '', 'new');
                    num++;
                }
            }
        },
        accept: function(sourceNodeScope, destNodeScope, destIndex) {
            if (destNodeScope.$element.hasClass('root'))
                return false; //don't allow moving to outside doc
            if (destNodeScope.node.aggr == 'none')
                return false;
            return true;
        }
    };

    var seenViewIds = {};
    function handleSingleView(v, aggr, propId) {
        var curNode = viewIds2node[v.id];
        if (!curNode) {
            curNode = {
                name: v.name,
                id: v.id,
                aggr: aggr,
                propertyId: propId,
                children: []
            };
            viewIds2node[v.id] = curNode;
        }
        origViews[v.id] = v;
        return curNode;
    }

    function handleChildren(curNode, childNodes) {
        var newChildNodes = [];
        for (var i = 0; i < childNodes.length; i++) {
            var node = childNodes[i];
            if (seenViewIds[node.id]) {
                return;
            }
            seenViewIds[node.id] = node;
            newChildNodes.push(node);
        }
        curNode.children.push.apply(curNode.children, newChildNodes);
    }

    MmsAppUtils.handleChildViews(documentOb, 'composite', undefined, documentOb._projectId, 
        documentOb._refId, handleSingleView, handleChildren)
    .then(function(docNode) {
        var num = 1;
        docNode.children.forEach(function(node) {
            updateNumber(node, num + '', 'old');
            updateNumber(node, num + '', 'new');
            num++;
        });
        $scope.tree = [docNode];
    });

    $scope.saveClass = "";
    var saving = false;
    $scope.save = function() {
        if (saving) {
            growl.info("please wait");
            return;
        }
        if ($scope.tree.length > 1 || $scope.tree[0].id !== documentOb.id) {
            growl.error('Views cannot be re-ordered outside the context of the current document.');
            return;
        }
        saving = true;
        $scope.saveClass = "fa fa-spin fa-spinner";
        var toSave = [];
        angular.forEach(viewIds2node, function(node: { aggr: string, children : any[]}, id) {
            if (node.aggr == 'none') {//cannot process views whose aggr is none since their children are not shown
                return;
            }
            var childViews = [];
            for (var i = 0; i < node.children.length; i++) {
                childViews.push({
                    id: node.children[i].id, 
                    aggregation: node.children[i].aggr,
                    propertyId: node.children[i].propertyId
                });
            }
            var orig = origViews[id];
            if (((!orig._childViews || orig._childViews.length === 0) && childViews.length > 0) ||
                (orig._childViews && !angular.equals(orig._childViews, childViews))) {
                toSave.push({
                    id: id,
                    //name: orig.name,
                    _childViews: childViews,
                    _projectId: orig._projectId,
                    _refId: orig._refId,
                    type: orig.type
                });
            }
        });
        if (toSave.length === 0) {
            growl.info("No changes to save!");
            saving = false;
            $scope.saveClass = "";
            return;
        }
        ElementService.updateElements(toSave, true)
        .then(function() {
            growl.success('Reorder Successful');
            navigate(true);
        }, function(response) {
            var reason = response.failedRequests[0];
            var errorMessage = reason.message;
            if (reason.status === 409) {
                growl.error("There's a conflict in the views you're trying to change!");
            } else {
                growl.error(errorMessage);
            }
        }).finally(function() {
            $scope.saveClass = "";
            saving = false;
        });
    };
    
    $scope.cancel = function() {
        navigate(false);
    };

    function navigate(reload) {
        var curBranch = $rootScope.ve_treeApi.get_selected_branch();
        if (!curBranch) {
            $state.go('project.ref.document', {}, {reload:true});
        } else {
            var goToId = curBranch.data.id;
            if (curBranch.type !== 'section' && curBranch.type !== 'view') {
                goToId = curBranch.viewId;
            }
            $state.go('project.ref.document.view', {viewId: goToId}, {reload: reload});
        }
    }
}]);
