(function (app) {
    var indexController = function ($scope, translationService, $window) {

        var lang = $window.navigator.language || $window.navigator.userLanguage;
        lang = lang.substring(0, 2);
        translationService.getTranslation(lang).then(function (results) {
        }, function (error) {
        });

        $scope.translate = translationService;


    };
    app.controller("indexController", ['$scope', 'translationService', '$window', indexController]);
}(angular.module("luccaApp")));