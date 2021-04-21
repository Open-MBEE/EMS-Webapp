

angular.module('mms').filter('underlineMatch', ['$filter', partialMatch]);
function partialMatch($filter) {
    var uibTypeaheadHighlightFn = $filter('uibTypeaheadHighlight');
    return function(match, query) {
        var result = uibTypeaheadHighlightFn(match, query);
        result = result.replace('<strong>', '<u>').replace('</strong>', '</u>');
        return result;
    }
}
