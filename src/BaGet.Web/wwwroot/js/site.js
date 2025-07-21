// Please see documentation at https://docs.microsoft.com/aspnet/core/client-side/bundling-and-minification
// for details on configuring this project to bundle and minify static web assets.

// Write your JavaScript code.
(function () {
    'use strict';

    var baget = {};
    window.baget = baget;

    function detectIE() {
        var ua = window.navigator.userAgent;
        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        // other browser or edge
        return false;
    }

    // source: http://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
    // enhancement with special case for IEs, otherwise the temp textarea will be visible
    baget.copyTextToClipboard = function (text, elementToFocus) {
        if (detectIE()) {
            try {
                window.clipboardData.setData('Text', text);
                console.log('Copying text command via IE-setData');
            } catch (err) {
                console.log('Oops, unable to copy via IE-setData');
            }
        }
        else {

            var textArea = document.createElement("textarea");

            //
            //  This styling is an extra step which is likely not required. 
            //
            // Why is it here? To ensure:
            // 1. the element is able to have focus and selection.
            // 2. if element was to flash render it has minimal visual impact.
            // 3. less flakyness with selection and copying which might occur if
            //    the textarea element is not visible.
            //
            // The likelihood is the element won't even render, not even a flash,
            // so some of these are just precautions. 
            // 
            // However in IE the element
            // is visible whilst the popup box asking the user for permission for
            // the web page to copy to the clipboard. To prevent this, we are using 
            // the detectIE workaround.

            // Place in top-left corner of screen regardless of scroll position.
            textArea.style.position = 'fixed';
            textArea.style.top = 0;
            textArea.style.left = 0;

            // Ensure it has a small width and height. Setting to 1px / 1em
            // doesn't work as this gives a negative w/h on some browsers.
            textArea.style.width = '2em';
            textArea.style.height = '2em';

            // We don't need padding, reducing the size if it does flash render.
            textArea.style.padding = 0;

            // Clean up any borders.
            textArea.style.border = 'none';
            textArea.style.outline = 'none';
            textArea.style.boxShadow = 'none';

            // Avoid flash of white box if rendered for any reason.
            textArea.style.background = 'transparent';


            textArea.value = text;

            document.body.appendChild(textArea);

            textArea.select();

            try {
                var successful = document.execCommand('copy');
                var msg = successful ? 'successful' : 'unsuccessful';
                console.log('Copying text command was ' + msg);
            } catch (err) {
                console.log('Oops, unable to copy');
            }

            document.body.removeChild(textArea);

            // Focus the element provided so that tab order is not reset to the beginning of the page.
            if (elementToFocus) {
                elementToFocus.focus();
            }
        }
    };

    // Package deletion functionality
    baget.deletePackageVersion = function (packageId, version) {
        var modal = document.getElementById('deleteModal');
        var deleteButton = document.getElementById('confirmDeleteBtn');
        var packageInfo = document.getElementById('packageDeleteInfo');
        
        // Set package info in modal
        packageInfo.textContent = packageId + ' v' + version;
        
        // Clear any previous API key
        document.getElementById('apiKeyInput').value = '';
        
        // Show modal
        $('#deleteModal').modal('show');
        
        // Update delete button click handler
        deleteButton.onclick = function() {
            var apiKey = document.getElementById('apiKeyInput').value;
            if (!apiKey) {
                alert('API Key gereklidir!');
                return;
            }
            
            baget.performPackageDelete(packageId, version, apiKey);
        };
    };

    baget.deleteAllVersions = function (packageId) {
        var modal = document.getElementById('deleteAllModal');
        var deleteButton = document.getElementById('confirmDeleteAllBtn');
        var packageInfo = document.getElementById('packageDeleteAllInfo');
        
        // Set package info in modal
        packageInfo.textContent = packageId + ' (tüm versiyonları)';
        
        // Clear any previous API key
        document.getElementById('apiKeyInputAll').value = '';
        
        // Show modal
        $('#deleteAllModal').modal('show');
        
        // Update delete button click handler
        deleteButton.onclick = function() {
            var apiKey = document.getElementById('apiKeyInputAll').value;
            if (!apiKey) {
                alert('API Key gereklidir!');
                return;
            }
            
            baget.performAllVersionsDelete(packageId, apiKey);
        };
    };

    baget.performPackageDelete = function (packageId, version, apiKey) {
        fetch('/api/v2/package/' + encodeURIComponent(packageId) + '/' + encodeURIComponent(version), {
            method: 'DELETE',
            headers: {
                'X-NuGet-ApiKey': apiKey,
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                alert('Paket versiyonu başarıyla silindi!');
                location.reload(); // Sayfayı yenile
            } else if (response.status === 401) {
                alert('Geçersiz API Key!');
            } else if (response.status === 404) {
                alert('Paket bulunamadı!');
            } else {
                alert('Silme işlemi başarısız oldu!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Bir hata oluştu: ' + error.message);
        })
        .finally(() => {
            $('#deleteModal').modal('hide');
        });
    };

    baget.performAllVersionsDelete = function (packageId, apiKey) {
        // Get all versions from the page
        var versionRows = document.querySelectorAll('.version-row');
        var versions = [];
        
        versionRows.forEach(row => {
            var versionLink = row.querySelector('td:first-child a');
            if (versionLink) {
                var version = versionLink.textContent.trim();
                versions.push(version);
            }
        });

        if (versions.length === 0) {
            alert('Silinecek versiyon bulunamadı!');
            $('#deleteAllModal').modal('hide');
            return;
        }

        var deletedCount = 0;
        var totalCount = versions.length;
        var errors = [];

        function deleteNextVersion(index) {
            if (index >= versions.length) {
                // Tüm silme işlemleri tamamlandı
                var message = totalCount + ' versiyondan ' + deletedCount + ' adeti başarıyla silindi.';
                if (errors.length > 0) {
                    message += '\nHatalar:\n' + errors.join('\n');
                }
                alert(message);
                location.reload();
                return;
            }

            var version = versions[index];
            fetch('/api/v2/package/' + encodeURIComponent(packageId) + '/' + encodeURIComponent(version), {
                method: 'DELETE',
                headers: {
                    'X-NuGet-ApiKey': apiKey,
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    deletedCount++;
                } else {
                    errors.push('v' + version + ': HTTP ' + response.status);
                }
            })
            .catch(error => {
                errors.push('v' + version + ': ' + error.message);
            })
            .finally(() => {
                // Bir sonraki versiyonu sil
                deleteNextVersion(index + 1);
            });
        }

        // Silme işlemini başlat
        deleteNextVersion(0);
        $('#deleteAllModal').modal('hide');
    };
})();