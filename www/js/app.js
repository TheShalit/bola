console.error = function (err) {
    alert(err);
};
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('bola', ['ionic', 'firebase'])

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

    .controller('eventsCtrl', function ($scope, $http, $ionicPopup, $ionicLoading, $filter) {
        $scope.tab = 'events';
        $scope.serverUrl = 'http://bola-server.herokuapp.com/';
        $scope.user = {};
        $scope.settings = {order: 'start_date', menuOpen: ''};
        var time = new Date('2000-01-01T' + $filter('date')(new Date(), 'HH:mm').slice(0, 4) + '0');
        var newEventProps = {
            avatar: 'img/default-event.png',
            start_date: new Date(),
            start_time: time,
            end_date: new Date(),
            end_time: time
        };
        $scope.newEvent = angular.copy(newEventProps);
        $http.defaults.withCredentials = true;
        $http.get('js/phone_prefix.json').
            success(function (data) {
                $scope.countries = data;
            });

        var serverRequest = function (extraUrl, success, params) {
            $http({
                url: $scope.serverUrl + extraUrl,
                method: "GET",
                params: params || {}
            }).
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

        var checkLogin = function (data) {
            $ionicLoading.hide();
            $scope.user = angular.extend({avatar: 'img/default-event.png'}, data.user);
            if ($scope.user.verified && $scope.user.name) {
                $scope.isLogin = true;
                $scope.getEvents();
            }
        }

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
            serverRequest('users/is_verified?uuid=' + uuid, checkLogin);
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
                    serverRequest('users/get_code',
                        function (data) {
                            $scope.user = data.user;
                        },
                        angular.extend($scope.user, {uuid: uuid})
                    );
                }

            });
        };

        $scope.verify = function () {
            serverRequest('users/verify_code', checkLogin, $scope.user);
        };

        $scope.openTab = function (tab) {
            $scope.tab = tab;
        };

        document.addEventListener("menubutton", function () {
            if ($scope.isLogin)
                $scope.openMenu('pages');
        }, false);

        $scope.openMenu = function (menu) {
            $scope.settings.menuOpen = $scope.settings.menuOpen == menu ? '' : menu;
        };

        $scope.getEvents = function () {
            serverRequest('events',
                function (data) {
                    $scope.events = data.events;
                }
            );
        };

        $scope.$watch('settings.order', function () {
            $scope.settings.menuOpen = '';
        });

        var getImage = function (type, toScope) {
            var options = {
                quality: 100,
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: Camera.PictureSourceType[type],
                allowEdit: true
            };
            navigator.camera.getPicture(function (imageURI) {
                $scope[toScope].avatar = imageURI;
                $scope.$apply();
            }, function (err) {
                alert(err);
            }, options);
        };

        $scope.chooseImage = function (toScope) {
            if (navigator.camera) {
                $ionicPopup.show({
                    title: 'Select Action',
                    buttons: [
                        {
                            text: '<i class="popup-icon ion-image"></i><span> Library</span>',
                            onTap: function () {
                                return 'PHOTOLIBRARY';
                            }
                        },
                        {
                            text: '<i class="popup-icon ion-camera"></i><span> Camera</span>',
                            onTap: function () {
                                return 'CAMERA';
                            }
                        }
                    ]
                }).then(function (type) {
                    getImage(type, toScope);
                });
            } else
                getImage('PHOTOLIBRARY');
        };

        $scope.updateUser = function () {
            var options = new FileUploadOptions();
            options.fileKey = "avatar";
            options.mimeType = "image/jpeg";
            options.chunkedMode = false;
            options.headers = {
                Connection: "close"
            };
            options.params = $scope.user;

            var ft = new FileTransfer();
            ft.upload($scope.user.avatar,
                encodeURI($scope.serverUrl + 'users/update'),
                function (data) {
                    $scope.user = angular.extend({avatar: 'img/default-event.png'}, data.user);
                    if ($scope.user.name) {
                        $scope.isLogin = true;
                        $scope.getEvents();
                    }
                },
                function () {

                }, options, true);
        };

        $scope.createEvent = function () {
            serverRequest('events/create', function (data) {
                var newEvent = angular.copy($scope.newEvent);
                newEvent['id'] = data['event_id'];
                $scope.events.push(newEvent);
                $scope.$apply();
                $scope.openTab('events');
                $scope.newEvent = angular.copy(newEventProps);
                $ionicPopup.confirm({
                    title: 'New Event',
                    template: '<div style="text-align:center">' + newEvent['title'] + ' has been created!</div>'
                });
            }, $scope.newEvent);
        };

        $scope.closeNewEvent = function () {
            $ionicPopup.confirm({
                title: 'Are you sure?',
                template: '<div style="text-align:center">Your new event will be removed</div>'
            }).then(function (res) {
                if (res)
                    openTab('events');
            })

        };

        $scope.openEvent = function (eventData) {
            $scope.event = eventData;
            $scope.openTab('event')
        }
    })

    .controller('eventCtrl', function ($scope, $http, $ionicScrollDelegate, $firebaseArray, $ionicPopup, $timeout) {
        $scope.firstLoad = true;
        $scope.messages = [];
        $scope.userId = $scope.$parent.user.id;
        $scope.event = $scope.$parent.event;
        $scope.message = {};

        $ionicScrollDelegate.scrollBottom();

        var itemsRef = new Firebase("https://boiling-torch-2188.firebaseio.com/events/" + $scope.event.id + '/');
        $scope.messages = $firebaseArray(itemsRef);

        itemsRef.on('child_added', function () {
            $ionicScrollDelegate.scrollBottom(true);
        });

        $scope.send = function () {
            $http({
                url: $scope.serverUrl + 'messages/create',
                method: "GET",
                params: {event_id: $scope.event.id, content: $scope.message.content}
            }).success(function (data) {
                if (data.success) {
                    $scope.message.content = '';
                } else {
                    $ionicPopup.alert({
                        title: 'Error',
                        template: '<div style="text-align:center">' + data.errs + '</div>'
                    });
                }
            });
        };

        $scope.$watch('$viewContentLoaded', function () {
            $ionicScrollDelegate.scrollBottom();

            $timeout(function () {
                $scope.firstLoad = false;
            }, 3000);
        });
    });