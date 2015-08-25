console.error = function (err) {
    alert(JSON.stringify(err));
};
// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('bola', ['ionic', 'ionic.service.core', 'ionic.service.push', 'ngCordova', 'firebase', 'contactFilter', 'ngAutocomplete'])

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

    .controller('eventsCtrl', function ($scope, $http, $ionicPopup, $ionicLoading, $filter,
                                        $rootScope, $ionicUser, $ionicPush) {
        $scope.tab = 'events';
        $scope.serverUrl = 'http://bola-server.herokuapp.com/';
        $scope.user = {};
        $scope.contacts = [];
        $scope.contactsLoaded = false;
        $scope.settings = {order: 'start_date', menuOpen: ''};
        var time = new Date('2000-01-01T' + $filter('date')(new Date(), 'HH:mm').slice(0, 4) + '0');
        var newEventProps = {
            avatar: 'img/default-event.png',
            start_date: new Date(),
            start_time: time,
            end_date: new Date(),
            end_time: time,
            invites: []
        };
        $scope.newEvent = angular.copy(newEventProps);
        $http.get('js/phone_prefix.json').
            success(function (data) {
                $scope.countries = data;
            });

        var serverRequest = function (extraUrl, success, params) {
            $http({
                url: $scope.serverUrl + extraUrl,
                method: "POST",
                withCredentials: true,
                data: params || {}
            }).success(function (data) {
                $ionicLoading.hide();
                if (data.success)
                    success(data);
                else {
                    $ionicPopup.alert({
                        title: 'Error',
                        template: '<div style="text-align:center">' + data.errs + '</div>'
                    });
                }
            }).error(function (data, status) {
                console.error(arguments);
                noInternet();
            });
        };

        var checkLogin = function (data) {
            $ionicLoading.hide();
            $scope.loginChecked = true;
            $scope.user = angular.extend({avatar: 'img/default-event.png'}, data.user);
            if ($scope.user.verified && $scope.user.name) {
                $scope.isLogin = true;
                $scope.getEvents();
            }
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

        $scope.identifyUser = function () {
            var user = $ionicUser.get();
            if (!user.user_id) {
                user.user_id = $ionicUser.generateGUID();
            }

            angular.extend(user, $scope.user);

            $ionicUser.identify(user).then(function () {
                // TODO No need then. auto sent to serve
            });
        };

        $scope.checkVerification = function (uuid) {
            serverRequest('users/is_verified', checkLogin, {uuid: uuid});
        };

        if (!window.cordova)
            $scope.checkVerification('development');

        $rootScope.$on('$cordovaPush:tokenReceived', function (event, data) {
            $scope.token = data.token; // TODO here token sent automatically so remove it
        });

        $scope.$on('$cordovaPush:notificationReceived', function (event, notification) {
            // TODO what to do with notifications inside the app
        });

        // Registers a device for push notifications and stores its token
        $scope.pushRegister = function () {
            console.log('Ionic Push: Registering user');

            // Register with the Ionic Push service.  All parameters are optional.
            $ionicPush.register();
        };

        document.addEventListener('deviceready', function () {
            var device = ionic.Platform.device();
            $scope.checkVerification(device.uuid);
            var options = new ContactFindOptions();
            var fields = ["name", "phoneNumbers", "photos"];
            options.multiple = true;
            options.desiredFields = fields;
            options.hasPhoneNumber = true;
            var watchLogin = $scope.$watch('isLogin', function () {
                if ($scope.isLogin) {
                    $scope.identifyUser(); // TODO identify only after user has profile
                    if (false)
                        navigator.contacts.find(fields, function (contacts) {
                            serverRequest('users/verified_phones', function (data) {
                                $scope.contactsLoaded = true;
                                $scope.phoneIds = data.contacts;
                                $scope.contacts = $filter('filter')(contacts, function (contact) {
                                    return $scope.phoneIds[contact.phoneNumbers[0].value];
                                });
                            }, {
                                contacts: contacts.map(function (contact) {
                                    return contact.phoneNumbers[0].value;
                                })
                            });
                        }, function () {
                            alert('error');
                        }, options);
                    watchLogin();
                }
            });
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
            $scope.openMenu();
            $scope.tab = tab;
        };

        document.addEventListener("menubutton", function () {
            if ($scope.isLogin)
                $scope.openMenu('pages');
        }, false);

        $scope.openMenu = function (menu) {
            $scope.settings.menuOpen = $scope.settings.menuOpen == menu ? '' : menu || '';
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
                sourceType: Camera.PictureSourceType[type]
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
            }
            else
                getImage('PHOTOLIBRARY');
        };

        var updateWithAvatar = function (url, success, params) {
            $ionicLoading.show({
                template: 'Uploading...'
            });

            var options = new FileUploadOptions();
            options.fileKey = "avatar";
            options.mimeType = "image/jpeg";
            options.chunkedMode = false;
            options.headers = {
                Connection: "close"
            };
            options.params = params;

            var ft = new FileTransfer();
            ft.upload(params.avatar,
                encodeURI($scope.serverUrl + url),
                function (requestData) {
                    var response = JSON.parse(requestData.response);
                    $ionicLoading.hide();

                    if (response.success)
                        success(response);
                    else
                        $ionicPopup.alert({
                            title: 'Error',
                            template: '<div style="text-align:center">' + response.errs + '</div>'
                        });
                },
                function () {
                    alert('error');
                }, options, true);
        };

        $scope.updateUser = function () {
            updateWithAvatar('users/update', function (data) {
                $scope.user = angular.extend({avatar: 'img/default-event.png'}, data.user);
                $ionicPopup.alert({
                    title: 'User Saved',
                    template: '<div style="text-align:center">Avatar and Name has been saved!</div>'
                });
                if ($scope.user.name) {
                    $scope.isLogin = true;
                    $scope.getEvents();
                    $scope.openTab('events');
                }
            }, $scope.user)
        };

        $scope.createEvent = function () {
            updateWithAvatar('events/create', function (data) {
                $scope.events.push(data.event);
                openEvent(data.event);
                $scope.newEvent = angular.copy(newEventProps);
                $ionicPopup.alert({
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

        $scope.openContacts = function () {
            $ionicLoading.show({
                template: 'Loading...'
            });
            if ($scope.contactsLoaded) {
                $ionicLoading.hide();
                $scope.openTab('contacts');
            }
            else {
                var unbind = $scope.$watch('contactsLoaded', function () {
                    $scope.openTab('contacts');
                    $ionicLoading.hide();
                    unbind();
                });
            }
        };

        $scope.saveContacts = function () {
            $scope.newEvent.invites = $filter('filter')($scope.contacts, {selected: true}).map(function (contact) {
                return $scope.phoneIds[contact.phoneNumbers[0].value];
            }).join();
            $scope.openTab('new_event');
        };

        $scope.openEvent = function (eventData) {
            $scope.event = eventData;
            $scope.openTab('event')
        };

        var attendingTypes = {
            'null': 'ion-ios-circle-filled',
            accept: 'ion-ios-checkmark',
            maybe: 'ion-ios-help',
            declined: 'ion-ios-close'
        };
        $scope.getStatus = function (status) {
            if (status == '')
                status = 'null';
            return attendingTypes[status || $scope.event.status];
        };

        $scope.changeAttending = function (type) {
            $ionicLoading.show({
                template: 'Updating...'
            });
            serverRequest('events/update_status',
                function () {
                    $scope.event.status = type;
                    $scope.openMenu();
                },
                {id: $scope.event.id, status: type}
            );
        };

        $scope.openWaze = function (location) {
            window.open("waze://?q=" + location);
        }
    })

    .controller('eventCtrl', function ($scope, $element, $http, $ionicScrollDelegate, $firebaseArray, $ionicPopup, $timeout) {
        $scope.firstLoad = true;
        $scope.eventPop = '';
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

        $element[0].querySelector('#msgInput').onblur = function () {
            this.focus();
        };

        window.addEventListener('native.keyboardshow', function () {
            $ionicScrollDelegate.scrollBottom(true);
        });

        $scope.sendMsg = function () {
            $http({
                url: $scope.serverUrl + 'messages/create',
                method: "POST",
                withCredentials: true,
                data: {event_id: $scope.event.id, content: $scope.message.content}
            }).success(function (data) {
                if (data.success) {
                    $scope.message.content = '';
                }
                else {
                    $ionicPopup.alert({
                        title: 'Error',
                        template: '<div style="text-align:center">' + data.errs + '</div>'
                    });
                }
            });
        };

        $scope.closePop = function () {
            $scope.eventPop = '';
        };

        $scope.openEventDetails = function () {
            $scope.openMenu();
            $scope.eventPop = 'event_details';
        };

        $scope.editEvent = function () {
            $scope.newEvent = $scope.event;
            $scope.eventPop = 'new_event';
        };

        $scope.openContacts = function () {
            var phones = $scope.event.invites.map(function (invite) {
                return invite.phone_number;
            });
            $scope.contacts.forEach(function (contact) {
                contact.selected = phones.indexOf($scope.phoneIds[contact.phoneNumbers[0].value]) > 0;
            });
            $scope.eventPop = 'contacts';
        };

        $scope.saveContacts = function () {
            $scope.newEvent.invites = $filter('filter')($scope.contacts, {selected: true}).map(function (contact) {
                return $scope.phoneIds[contact.phoneNumbers[0].value];
            }).join();
            $scope.openEventDetails();
        };

        $scope.$watch('$viewContentLoaded', function () {
            $ionicScrollDelegate.scrollBottom();

            $timeout(function () {
                $scope.firstLoad = false;
            }, 3000);
        });
    });