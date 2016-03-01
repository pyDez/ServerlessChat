(function () {
    var app = angular.module("luccaApp", ["ngRoute"]);
    app.config(function ($routeProvider) {
        $routeProvider
          .when("/chat", {
              templateUrl: "luccaApp/chat/chat.html",
              controller: "chatController"
          })
          .otherwise({
              redirectTo: "/chat"
          });
    });
}());