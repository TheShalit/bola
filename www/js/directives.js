angular.module('bolaDirectives', ['ionic', 'bolaServices'])

    .directive('backButton', function ($ionicHistory) {
        return {
            restrict: 'E',
            replace: true,
            template: '<button type="button" class="button button-icon ion-android-arrow-back"></button>',
            link: function (scope, element) {
                element.on('click', function () {
                    $ionicHistory.goBack();
                });
            }
        }
    })

    .directive('topMenu', function ($rootScope) {
        return {
            restrict: 'E',
            scope: {
                btnIcon: '@',
                menuClass: '@',
                direction: '@',
                ngClass: '=',
                disableOpen: '='
            },
            transclude: true,
            replace: true,
            link: function (scope, element) {
                scope.toggleMenu = function (close) {
                    if (!scope.disableOpen)
                        $rootScope.menu = ($rootScope.menu == element || close) ? null : element;
                };

                $rootScope.$watch('menu', function (value) {
                    scope.isOpen = value == element;
                });
            },
            template: '<button class="button button-icon {{btnIcon}}" ng-click="toggleMenu()">' +
            '<div style="{{direction}}: 0" class="list ng-hide events-menu {{menuClass}}" ng-show="isOpen" ng-transclude></div>' +
            '</button>'
        }
    })


    .directive('errSrc', function () {
        return {
            link: function (scope, element, attrs) {
                element.bind('error', function () {
                    if (attrs.src != attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });

                attrs.$observe('ngSrc', function (value) {
                    if (!value && attrs.errSrc) {
                        attrs.$set('src', attrs.errSrc);
                    }
                });
            }
        }
    })

    .directive('avatarUploader', function ($ionicPopup, getImage) {
        return {
            restrict: 'E',
            scope: {
                fallbackSrc: '@',
                avatar: '=',
                ngClass: '='
            },
            link: function (scope, element) {
                var fileInput = element.find('input')[0];

                fileInput.onChange = function (input) {
                    if (input.files && input.files[0]) {
                        var reader = new FileReader();

                        reader.onload = function (e) {
                            scope.avatar = e.target.result;
                        };

                        reader.readAsDataURL(input.files[0]);
                    }
                };

                scope.chooseImage = function () {
                    if (window.cordova)
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
                                getImage(type).then(function (avatar) {
                                    scope.avatar = avatar;
                                })
                            });
                        }
                        else
                            getImage('PHOTOLIBRARY');
                    else
                        fileInput.click();
                };
            },
            replace: true,
            template: '<div class="avatar-image">' +
            '<input type="file" name="avatar" accept="image/*"/>' +
            '<img err-src="/img/placeholder.png" ng-src="{{avatar}}" ng-click="chooseImage()"/>' +
            '</div>'
        }
    })

    .directive('messageContent', function () {
        return {
            restrict: 'E',
            scope: {
                content: '=ngModel'
            },
            link: function (scope, element) {
                element.find('input')[0].onBlur = function () {
                    this.focus();
                };
            },
            template: '<div class="message-input">' +
            '<label>' +
            '<input id="msgInput" type="text" class="message-content" ng-model="content"' +
            'placeholder="Send a message..."/>' +
            '</label>' +
            '</div>' +
            '<div class="submit-message">' +
            '<button class="button button-icon ion-android-send" type="submit"' +
            'ng-disabled="!content">&nbsp;</button>' +
            '</div>'
        }
    })

    .directive('pickDateTime', function ($cordovaDatePicker) {
        return {
            restrict: 'E',
            scope: {
                dateModel: '=ngModel',
                ngShow: '='
            },
            link: function (scope) {

                scope.openWhen = function (type) {
                    var options = {
                        date: new Date(),
                        mode: type,
                        minDate: new Date(),
                        allowOldDates: false,
                        allowFutureDates: true
                    };

                    $cordovaDatePicker.show(options).then(function (date) {
                        if (type == 'date')
                            scope.dateModel.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                        else
                            scope.dateModel.setHours(date.getHours(), date.getMinutes());
                    });
                };
            },
            replace: true,
            template: '<div class="row">\
            <div class="col" ng-click="openWhen(\'date\')">\
            <i class="ion-calendar"> {{dateModel | date:"dd/MM/yyyy"}}</i>\
            </div>\
            <div class="col" ng-click="openWhen(\'time\')">\
            <i class="ion-clock"> {{dateModel | date:"HH:mm"}}</i>\
            </div>\
            </div>'
        }
    });