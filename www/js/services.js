angular.module('bolaServices', [])

    .constant('API_URL', 'http://bola-server.herokuapp.com/')

    .factory('noInternet', function ($ionicLoading, $ionicPopup) {
        return function () {
            $ionicLoading.hide();
            $ionicPopup.alert({
                title: 'No Internet',
                template: '<div style="text-align:center">Sorry, try again later</div>'
            });
        };
    })

    .factory('phonePrefix', function ($http) {
        return $http.get('data/phone_prefix.json');
    })

    .factory('serverRequest', function (API_URL, $http, $rootScope, $ionicLoading, $ionicPopup, noInternet) {
        return function (extraUrl, success, params) {
            params = params || {}
            params['user_id'] = $rootScope.user.id;
            $http({
                url: API_URL + extraUrl,
                method: "POST",
                withCredentials: true,
                data: params || {}
            }).success(function (data) {
                $ionicLoading.hide();
                if (data.success)
                    success(data);
                else {
                    console.log(data);
                    $ionicPopup.alert({
                        title: 'Error',
                        template: '<div style="text-align:center">' + (data.errs || data.msg) + '</div>'
                    });
                }
            }).error(function (data, status) {
                noInternet();
            });
        };
    })

    .factory('getImage', function ($q) {
        return function (type) {
            var deferred = $q.defer(),
                options = {
                    quality: 100,
                    destinationType: Camera.DestinationType.FILE_URI,
                    sourceType: Camera.PictureSourceType[type]
                };
            navigator.camera.getPicture(function (imageURI) {
                deferred.resolve(imageURI);
            }, function (err) {
                alert(err);
            }, options);

            return deferred.promise;
        }
    })

    .factory('updateWithAvatar', function (API_URL, $ionicLoading, $ionicPopup) {
        return function (url, success, params) {
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
                encodeURI(API_URL + url),
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
    })


    .constant('ATTENDING_STATUSES', {
        'null': 'ion-ios-circle-filled',
        accept: 'ion-ios-checkmark ',
        maybe: 'ion-ios-help',
        declined: 'ion-ios-close'
    })

    .factory('statuses', function (ATTENDING_STATUSES) {
        return function (status) {
            if (status == '')
                status = 'null';
            return ATTENDING_STATUSES[status];
        }
    })

    .factory('eventsFactory', function ($q, serverRequest) {
        var events = {};

        return {
            refreshEvents: function (byId) {
                var deferred = $q.defer();
                serverRequest('events',
                    function (data) {
                        var stringifyEvents = JSON.stringify(data.events);

                        events = {};
                        data.events.forEach(function (event) {
                            events[event.id] = event;
                        });
                        if (byId)
                            deferred.resolve(events[byId]);

                        if (stringifyEvents != window.localStorage.events) {
                            window.localStorage.events = stringifyEvents;
                            deferred.resolve(data.events);
                        } else
                            deferred.reject();
                    }
                );
                return deferred.promise;
            },
            byIdCache: function (id) {
                return events[+id] || {};
            },
            byId: function (id) {
                return this.refreshEvents(id);
            }
        };
    })

    .factory('messagesFactory', function (serverRequest, $rootScope) {
        return {
            messages: JSON.parse(window.localStorage.messages || '{}'),
            getMessages: function (eventId) {
                var me = this;
                serverRequest('messages/from',
                    function (data) {
                        if (data['messages'].length > 0)
                            me.updateMessages(eventId, data['messages']);
                    },
                    {
                        event_id: eventId,
                        updated_at: me.messages[eventId] && me.messages[eventId]['updatedAt']
                    }
                );
                return me.messages[eventId] ? me.messages[eventId]['messages'] : [];
            },
            updateMessages: function (eventId, extraMessages) {
                console.log(extraMessages);
                this.messages[eventId] = this.messages[eventId] || {};
                this.messages[eventId]['messages'] = (this.messages[eventId]['messages'] || []).concat(extraMessages);
                this.messages[eventId]['updatedAt'] = extraMessages[extraMessages.length - 1]['updated_at'];

                $rootScope.$emit('newMessages', extraMessages);
                window.localStorage.messages = JSON.stringify(this.messages);
            }
        };
    });