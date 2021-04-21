import * as angular from "angular";
var mms = angular.module('mms');

mms.factory('ShortenUrlService', ['$http', '$q', 'URLService', 'UtilsService', ShortenUrlService]);

function ShortenUrlService($http, $q, URLService, UtilsService) {

    function getShortUrl(currentUrl, scope) {
        var SHARE_URL = 'https://opencae.jpl.nasa.gov/goto/';
        return $http.post('https://purl-prod.jpl.nasa.gov/create', {'url': currentUrl}, {headers: {'Authorization': 'Basic Og=='}})
            .then(function (response) {
                scope.shortUrl = SHARE_URL + response.data.link;
            }, function (response) {
                return URLService.handleHttpStatus(response.data, response.status, response.headers, response.config, $q.defer());
            });
    }

    return {
        dynamicPopover: {
            templateUrl: 'shareUrlTemplate.html',
            title: 'Share'
        },
        copyToClipboard: function ($event) {
            UtilsService.copyToClipboard($('#ve-short-url'), $event);
        },
        getShortUrl: getShortUrl
    };
}
