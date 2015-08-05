// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('starter', ['ionic'])

    .run(function ($ionicPlatform) {
        $ionicPlatform.ready(function () {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            if (window.cordova && window.cordova.plugins.Keyboard) {
                cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
            }
            if (window.StatusBar) {
                StatusBar.styleDefault();
            }
        });
    })

    .controller('eventsCtrl', function ($scope, $http, $ionicSideMenuDelegate) {
        $scope.tab = 'events';

        $scope.login = function () {
            $http.get('login-page').
                success(function (data) {
                    $scope.user = data.user;
                }).
                error(function (data, status) {
                    //alert('note good' + status);
                    // TODO remove after rails login
                    $scope.user = {
                        name: 'Shalev Shalit',
                        img: 'https://fbcdn-sphotos-d-a.akamaihd.net/hphotos-ak-xpa1/v/t1.0-9/1467418_10202532683626497_1891945580_n.jpg?oh=311833ac06ec948e273cfcee3ed244fa&oe=563B1FA9&__gda__=1446779510_e21009ca79358fc3187c2324670b1410'
                    };
                });


        }
    });