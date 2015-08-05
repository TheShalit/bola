// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('bola', ['ionic'])

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

    .controller('eventsCtrl', function ($scope, $http, $ionicPopup, $ionicLoading) {
        $scope.tab = 'events';
        $scope.serverUrl = 'http://bola-server.herokuapp.com/';
        $scope.user = {};
        $http.defaults.withCredentials = true;
        $http.get('js/phone_prefix.json').
            success(function (data) {
                $scope.countries = data;
            });

        var serverRequest = function (extraUrl, success) {
            $http.get($scope.serverUrl + extraUrl).
                success(function (data) {
                    $ionicLoading.hide();
                    if (data.success)
                        success(data);
                    else {
                        $ionicPopup.alert({
                            title: 'Error',
                            template: '<div style="text-align:center">' + data.errs + '</div>'
                        });
                    }
                }).
                error(function (data, status) {
                    noInternet();
                });
        };

        var noInternet = function () {
            $ionicLoading.hide();
            $ionicPopup.alert({
                title: 'No Internet',
                template: '<div style="text-align:center">Sorry, try again later</div>'
            });
        };

        $ionicLoading.show({
            template: 'Checking User...'
        });

        $scope.checkVerification = function (uuid) {
            serverRequest('users/is_verified?uuid=' + uuid,
                function (data) {
                    $ionicLoading.hide();
                    if (data.verified) {
                        $scope.userId = data.user_id;
                        $scope.isLogin = true;
                        $scope.getEvents();
                    } else
                        $scope.toVerify = true;
                }
            );
        };

        if (!window.cordova)
            $scope.checkVerification('development');

        document.addEventListener('deviceready', function () {
            $scope.checkVerification(device.uuid);
        }, false);

        $scope.getCode = function () {
            var confirmPopup = $ionicPopup.confirm({
                title: 'Validate phone number',
                template: '<div style="text-align:center">Are you sure that<br><b>+' + $scope.user.phone_prefix + $scope.user.phone_number + '</b><br>is your number?</div>'
            });
            confirmPopup.then(function (res) {
                $ionicLoading.show({
                    template: 'Loading...'
                });
                if (res) {
                    var uuid = window.cordova ? device.uuid : 'development';
                    serverRequest('users/get_code?uuid=' + uuid + '&phone_number=' + $scope.user.phone_number + '&phone_prefix=' + $scope.user.phone_prefix,
                        function (data) {
                            $scope.userId = data.user_id;
                        }
                    );
                }

            });
        };

        $scope.verify = function () {
            serverRequest('users/verify_code?user_id=' + $scope.userId + '&verify_code=' + $scope.user.verify_code,
                function () {
                    $scope.isLogin = true;
                    $scope.getEvents();
                }
            );
        };

        $scope.openTab = function (tab) {
            $scope.tab = tab;
        };

        $scope.getEvents = function () {
            serverRequest('events',
                function (data) {
                    $scope.events = data.events;
                }
            );
        }
    });