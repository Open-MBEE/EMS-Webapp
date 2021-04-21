import * as angular from 'angular'
var mms = angular.module('mms');

mms.factory('BrandingService', ['$rootScope', BrandingService]);

/**
 * @ngdoc service
 * @name mms.BrandingService
 * 
 * @description
 * Branding Service
 */
function BrandingService($rootScope) {
    //TODO: Refactor to Classes
    var b = {
        label : {
            pi : 'PROPRIETARY: Proprietary Information',
            export_ctrl : 'EXPORT WARNING: No export controlled documents allowed on this server',
            no_public_release : 'Not for Public  Release or Redistribution',
            unclassified : 'CLASSIFICATION: This system is UNCLASSIFIED',
        },
        applied_labels : [],
        veNav_address : ''
    };

    var banner = {
        message: ''
    };

    var loginBanner = {
        labels : []
    };

    var footer = {
        message : ''
    };

    // An ordered list of the labels that will be applied to footer and other key areas 
    b.applied_labels = [b.label.unclassified,
                        b.label.pi + ' - ' +
                        b.label.no_public_release];

    // The banner is optional. It is generated in the mmsApp directive veSystemBanner.
    // If you use a banner, the message field is required. Other fields are optional.
    banner.message    = b.label.pi;

    loginBanner.labels = b.applied_labels;
    //b.banner.background = '#0D47A1';
    //b.banner.color      = '#e8e8e8';

    
    footer.message = b.label.pi + ' - ' + b.label.no_public_release;
    
    // Navigation and URLs 
    b.veNav_address = 'https://cae-ems-uat.jpl.nasa.gov';

    var getBanner = function() {
        return banner;
    };

    var getLoginBanner = function() {
        return loginBanner;
    };

    var getFooter = function() {
        return footer;
    };
    return {
        getBanner: getBanner,
        getLoginBanner: getLoginBanner,
        getFooter: getFooter
    };
}