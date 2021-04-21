'use strict';

describe('Directive: mmsButtonBar', function() {

	var $rootScope, 
		scope, 
		element,
		$compile;
	var $httpBackend;

	beforeEach(module('mms'));
	beforeEach(module('mms.directives'));

	beforeEach(function() {
		inject(function($injector) {
		
		$rootScope		= $injector.get('$rootScope');
		$compile		= $injector.get('$compile');
		scope 			= $rootScope.$new();
		});
	});

	it('should test the mmsButtonBar Directive', function() {
		scope.bbApi = $rootScope.mmsBbApi;
		scope.buttons = $rootScope.buttons;
		element = angular.element('<button-bar-component buttons="buttons" mms-bb-api="bbApi"></button-bar-component>');
		$compile(element)(scope);
		scope.$apply();
	});
});