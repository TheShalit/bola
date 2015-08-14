angular.module('contactFilter', []).filter('contactFilter', function () {
    return function (items, searchText) {
        if (searchText) {
            var filtered = [];
            angular.forEach(items, function (item) {
                if (item.name.formatted.indexOf(searchText) >= 0 || item.phoneNumbers[0].value.indexOf(searchText) >= 0)
                    filtered.push(item);
            });
            return filtered;
        } else
            return items;
    };
});