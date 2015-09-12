angular.module('bolaControllers',
    ['ionic', 'bolaServices', 'ionic.service.core', 'ionic.service.push', 'ngCordova', 'firebase',
        'contactFilter', 'ion-google-place'])

    .controller('registrationCtrl', function ($scope, serverRequest, $ionicPopup, $ionicLoading, $ionicHistory,
                                              $rootScope, $ionicUser, $ionicPush) {
        $scope.getCode = function () {
            $ionicPopup.confirm({
                title: 'Validate phone number',
                template: '<div style="text-align:center">Are you sure that<br><b>+' + $rootScope.user.phone_prefix + $rootScope.user.phone_number + '</b><br>is your number?</div>'
            }).then(function (res) {
                if (res) {
                    $ionicLoading.show({
                        template: 'Loading...'
                    });
                    serverRequest('users/get_code',
                        function (data) {
                            var user = $ionicUser.get();
                            if (!user.user_id)
                                user.user_id = $ionicUser.generateGUID();

                            angular.extend(user, data.user);

                            $ionicUser.identify(user).then(function () {
                                angular.extend($rootScope.user, user);
                            });
                        },
                        angular.extend($rootScope.user, {uuid: (window.cordova ? ionic.Platform.device().uuid : 'development')})
                    );
                }
            });
        };

        $scope.verify = function () {
            serverRequest('users/verify_code', function (data) {
                angular.extend($rootScope.user, data.user);
                $ionicUser.identify($rootScope.user).then(function () {
                    $ionicPush.register();
                });
                if ($rootScope.user.verified && $rootScope.user.name) {
                    $ionicHistory.nextViewOptions({
                        disableAnimate: true,
                        disableBack: true
                    });
                    $state.go('events');
                }
            }, $rootScope.user);
        };
    })

    .controller('eventsCtrl', function ($scope, $state, $ionicHistory, $ionicPopup, $ionicLoading, $filter,
                                        serverRequest, $rootScope, $ionicUser, $cordovaDatePicker,
                                        updateWithAvatar, phonePrefix, eventsFactory) {
        $scope.userData = {};
        $scope.contacts = [];
        $scope.events = JSON.parse(window.localStorage.events || '[]');
        $scope.contactsLoaded = false;
        $scope.settings = {order: 'start_date'};
        var newEventProps = {
            avatar: 'img/default-event.png',
            start_date: new Date(),
            end_date: new Date(),
            invites: []
        };
        $scope.newEvent = angular.copy(newEventProps);
        phonePrefix.success(function (data) {
            $scope.countries = data;
        });

        if ($rootScope.user.name)
            eventsFactory.refreshEvents().then(function (eventsData) {
                $scope.events = eventsData;
            });

        document.addEventListener('deviceready', function () {
            $scope.checkVerification(ionic.Platform.device().uuid);
            var options = new ContactFindOptions();
            var fields = ["name", "phoneNumbers", "photos"];
            options.multiple = true;
            options.desiredFields = fields;
            options.hasPhoneNumber = true;
            var watchLogin = $rootScope.$watch('user.verified', function () {
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
            });
        }, false);

        $scope.updateUser = function () {
            updateWithAvatar('users/update', function (data) {
                angular.extend($rootScope.user, data.user);
                $ionicPopup.alert({
                    title: 'User Saved',
                    template: '<div style="text-align:center">Avatar and Name has been saved!</div>'
                });
                if ($rootScope.user.name) {
                    eventsFactory.refreshEvents().then(function (eventsData) {
                        $scope.events = eventsData;
                    });
                    $state.go('events');
                }
            }, angular.extend({}, $rootScope.user, $scope.userData));
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
            }, angular.extend($scope.newEvent, {location: $scope.newEvent.location.formatted_address}));
        };

        $scope.closeNewEvent = function () {
            $ionicPopup.confirm({
                title: 'Are you sure?',
                template: '<div style="text-align:center">Your new event will be removed</div>'
            }).then(function (res) {
                if (res)
                    $ionicHistory.goBack();
            })
        };

        $scope.openContacts = function () {
            $ionicLoading.show({
                template: 'Loading...'
            });
            if ($scope.contactsLoaded) {
                $ionicLoading.hide();
                $state.go('contacts');
            }
            else {
                var unbind = $scope.$watch('contactsLoaded', function () {
                    $state.go('contacts');
                    $ionicLoading.hide();
                    unbind();
                });
            }
        };

        $scope.saveContacts = function () {
            $scope.newEvent.invites = $filter('filter')($scope.contacts, {selected: true}).map(function (contact) {
                return $scope.phoneIds[contact.phoneNumbers[0].value];
            }).join();

            $ionicHistory.goBack();
        };

        $scope.changeAttending = function (type) {
            $ionicLoading.show({
                template: 'Updating...'
            });
            serverRequest('events/update_status',
                function () {
                    $scope.event.status = type;
                },
                {id: $scope.event.id, status: type}
            );
        };
    })

    .controller('eventCtrl', function ($scope, $ionicScrollDelegate, $firebaseArray, $ionicPopup, $rootScope,
                                       $timeout, serverRequest, eventsFactory, $stateParams, statuses) {
        $scope.firstLoad = true;
        $scope.eventPop = '';
        $scope.messages = [];
        $scope.userId = $rootScope.user.id;
        $scope.event = eventsFactory.byIdCache($stateParams.eventId);
        $scope.newMessage = {};

        var itemsRef = new Firebase("https://boiling-torch-2188.firebaseio.com/events/" + $stateParams.eventId + '/');
        $scope.messages = $firebaseArray(itemsRef);

        itemsRef.on('child_added', function () {
            $ionicScrollDelegate.scrollBottom(true);
        });

        $scope.getStatus = statuses;

        if ($stateParams.eventId)
            eventsFactory.byId($stateParams.eventId).then(function (event) {
                $scope.event = event;
            });

        window.addEventListener('native.keyboardshow', function () {
            $ionicScrollDelegate.scrollBottom(true);
        });

        $scope.sendMsg = function () {
            serverRequest('messages/create', function () {
                $scope.newMessage.content = '';
            }, {event_id: $scope.event.id, content: $scope.newMessage.content});
        };

        $scope.closePop = function () {
            $scope.eventPop = '';
        };

        $scope.openEventDetails = function () {
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

        $scope.openWaze = function (location) {
            window.open("waze://?q=" + location);
        };
    });