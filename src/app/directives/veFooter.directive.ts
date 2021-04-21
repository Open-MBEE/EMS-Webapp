import * as angular from 'angular';
var mmsApp = angular.module('mmsApp');


mmsApp.directive('veFooter', veFooter);

function veFooter() {
    var template = 'partials/mms/veFooter.html';

    //var no_banner = { template: '' };
    //if ( !BrandingService.hasOwnProperty('banner') ||
    //     !BrandingService.banner.hasOwnProperty('message') ) {
    //    return no_banner;
    //};
    var veFooterLink = function(scope) {
        scope.ve_footer = scope.footer.message;
    };


    return {
        templateUrl: template,
        link: veFooterLink
    };
}