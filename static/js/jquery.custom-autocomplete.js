/*jslint    browser:    true,
            indent:     4 */
/*global    jQuery */

/**
 * jQuery Custom Autocomplete 0.1
 *
 * Copyright (c) 2011, Jonny Gerig Meyer
 * All rights reserved.
 *
 * Licensed under the New BSD License
 * See: http://www.opensource.org/licenses/bsd-license.php
 */
(function ($) {

    'use strict';

    // TODO: replace ``return false;``

    var cache = {};

    $.fn.customAutocomplete = function (opts) {
        var options = $.extend({}, $.fn.customAutocomplete.defaults, opts),
            context = $(this),
            textbox = context.find(options.textbox),
            formActions = context.find(options.formActions),
            suggestionList = context.find(options.suggestionList),
            inputList = context.find(options.inputList),
            newInputList = context.find(options.newInputList),
            inputs = inputList.add(newInputList).find(options.inputs),
            newInputTextbox = newInputList.find(options.newInputTextbox),
            expiredList = context.find(options.expiredList),
            placeholder = textbox.attr('placeholder'),
            url = options.url,
            newCounter = 1,
            getSuggestions = true,
            newSuggestions,
            newSuggestion,
            typedText,
            updateSuggestions,

            // Removes (faked) placeholder text from textbox
            removeFakePlaceholder = function () {
                if (textbox.val().indexOf(placeholder) !== -1) {
                    textbox.val(null);
                }
                textbox.removeClass('placeholder');
            },

            // Checks if any inputs have changed from original-state,
            // showing form-actions if any inputs have changed.
            updateFormActions = function () {
                if (inputs.filter(function () { return $(this).data('state') === 'changed'; }).length) {
                    expiredList.addClass('expired');
                    if (options.hideFormActions) {
                        formActions.fadeIn('fast');
                    }
                } else {
                    expiredList.removeClass('expired');
                    if (options.hideFormActions) {
                        formActions.fadeOut('fast');
                    }
                }
            },

            passRestrictedNewInputs = function (thisCategory, newInputName) {
                // If the keyword category already has selected filters...
                if (thisCategory.find(options.inputs + ':checked').length) {
                    // ...and if *all* of the selected filters begin with "^" and ends with "$"...
                    if (thisCategory.find(options.inputs + '[value^="^"][value$="$"]:checked').length === thisCategory.find(options.inputs + ':checked').length
                            // ...and if the typed-text hasn't already been selected as a filter, and if the typed-text begins with "^" and ends with "$"...
                            && !(thisCategory.find(options.inputs + '[value="' + newInputName + '"]:checked').length)
                            && newInputName.indexOf('^') === 0
                            && newInputName.lastIndexOf('$') === newInputName.length - 1) {
                        // ...then append the keyword suggestion to the suggestion-list.
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return true;
                }
            },

            updateSuggestions = function (data) {
                var filteredSuggestions;
                typedText = textbox.val();
                if (data) {
                    console.log('do something with ajax');
                } else {
                    var data = {},
                        suggestions = inputList.find(options.inputs).parent('li').filter(function () {
                            return $(this).children('label').text().toLowerCase().indexOf(typedText.toLowerCase()) !== -1;
                        });
                    data["suggestions"] = [];
                    suggestions.each(function () {
                        var typedIndex = $(this).children('label').text().toLowerCase().indexOf(typedText.toLowerCase()),
                            thisSuggestion = {};
                        thisSuggestion["typedText"] = typedText;
                        thisSuggestion["fullText"] = $(this).children('label').text();
                        thisSuggestion["preText"] = $(this).children('label').text().substring(0, typedIndex);
                        thisSuggestion["postText"] = $(this).children('label').text().substring(typedIndex + typedText.length);
                        thisSuggestion["id"] = $(this).children('input').attr('value');
                        if (options.multipleCategories) {
                            thisSuggestion["category"] = $(this).children('input').attr('name');
                            if ($(this).closest(options.inputList).find('.category-title').length) {
                                thisSuggestion["displayCategory"] = $(this).closest(options.inputList).find('.category-title').text();
                            }
                        }
                        data["suggestions"].push(thisSuggestion);
                    });
                }

                if (options.allowNew) {
                    newInputList.each(function () {
                        var thisSuggestion = {};
                        thisSuggestion["typedText"] = typedText;
                        thisSuggestion["fullText"] = typedText;
                        thisSuggestion["newSuggestion"] = true;
                        if (options.multipleCategories) {
                            thisSuggestion["category"] = $(this).data('name');
                            if ($(this).find('.category-title').length) {
                                thisSuggestion["displayCategory"] = $(this).find('.category-title').text();
                            }
                        }

                        if (options.restrictNewInputs) {
                            if (passRestrictedNewInputs($(this), typedText)) {
                                data["suggestions"].push(thisSuggestion);
                            }
                        } else {
                            data["suggestions"].push(thisSuggestion);
                        }
                    });
                }

                newSuggestions = ich.autocomplete_suggestion(data);
                filteredSuggestions = newSuggestions.filter(function () {
                    var thisSuggestionID = $(this).find('a').data('id'),
                        thisSuggestionCategory = $(this).find('a').data('category');
                    if ($(this).find('a').hasClass('new')) {
                        return !(inputs.filter('[id^="id-' + thisSuggestionCategory + '-"]:checked').filter(function () { return $(this).siblings('label').text() === thisSuggestionID; }).length);
                    } else {
                        return !(inputs.filter('#id-' + thisSuggestionCategory + '-' + thisSuggestionID + ':checked').length);
                    }
                });

                suggestionList.html(filteredSuggestions).show();

                // Adds ".selected" to first autocomplete suggestion.
                if (!(suggestionList.find('.selected').length)) {
                    suggestionList.find('li:first-child a').addClass('selected');
                }
            };

        suggestionList.hide();

        if (options.hideFormActions) {
            formActions.hide();
        }

        if (options.fakePlaceholder) {
            textbox.addClass('placeholder');
        }

        if (!options.multipleCategories && options.newInputList === null) {
            newInputList = context.find(options.inputList);
            newInputTextbox = newInputList.find(options.newInputTextbox);
            options.newInputList = options.inputList;
        }

        if (!expiredList.length) {
            expiredList = $(options.expiredList);
        }

        // Set data-originallyChecked on each input to store original state
        inputs.each(function () {
            $(this).data('originallyChecked', $(this).is(':checked'));
        });

        // Reset button sets each input to its original state, hides form-actions
        // and suggestion-list, and returns focus to the textbox.
        formActions.find('.reset').click(function (e) {
            e.preventDefault();
            if (options.hideFormActions) {
                formActions.fadeOut('fast');
            }
            expiredList.removeClass('expired');
            inputs.each(function () {
                $(this).removeData('state');
                $(this).prop('checked', $(this).data('originallyChecked'));
            });
            textbox.focus();
            suggestionList.hide();
        });

        // Selecting/unselecting an input returns focus to textbox, hides
        // suggestion-list, sets data-state "changed" if input has changed from
        // original state, and shows/hides form-actions as appropriate.
        inputList.add(newInputList).delegate(options.inputs, 'change', function () {
            if ($(this).data('originallyChecked') !== $(this).is(':checked')) {
                $(this).data('state', 'changed');
            } else {
                $(this).removeData('state');
            }
            textbox.focus();
            suggestionList.hide();
            updateFormActions();
        });

        // If there are any keyword filters already selected, prevent a new filter from being selected
        // unless it and all existing keyword filters begin with ^ and end with $.
        if (options.restrictNewInputs) {
            newInputList.delegate(options.inputs + ':not(:checked) + label', 'click', function () {
                var thisCategory = $(this).closest(options.newInputList),
                    thisInputName = $(this).text();
                if (!passRestrictedNewInputs(thisCategory, thisInputName)) {
                    textbox.focus();
                    return false;
                }
            });
        }

        textbox
            .keyup(function (e) {
                var updateSuggestionList = function () {
                    if (textbox.val() !== typedText && textbox.val() !== placeholder) {
                        typedText = textbox.val();
                        if (typedText.length) {
                            if (options.ajax) {
                                $.get(options.url, {text: typedText}, updateSuggestions);
                            } else {
                                updateSuggestions();
                            }
                        } else {
                            suggestionList.empty().hide();
                        }
                    }
                };
                // Updates suggestion-list if typed-text has changed
                if (options.ajax) {
                    $(this).doTimeout(300, function () {
                        updateSuggestionList();
                    });
                } else {
                    updateSuggestionList();
                }
            })
            .keydown(function (e) {
                // If textbox still has fake placeholder text, removes it on keydown for non-meta keys other than shift, ctrl, alt, caps, or esc.
                if (textbox.hasClass('placeholder') && options.fakePlaceholder) {
                    if (!e.metaKey && e.keyCode !== CC.keycodes.SHIFT && e.keyCode !== CC.keycodes.CTRL && e.keyCode !== CC.keycodes.ALT && e.keyCode !== CC.keycodes.CAPS && e.keyCode !== CC.keycodes.ESC) {
                        removeFakePlaceholder();
                    }
                }
                // If the suggestion list is not visible...
                if (!suggestionList.is(':visible')) {
                    // ...prevent normal TAB function
                    if (e.keyCode === CC.keycodes.TAB && textbox.val() !== '') {
                        e.preventDefault();
                        suggestionList.show();
                    }
                    // ...submit the form on ENTER if textbox is empty and inputs have changed
                    if (e.keyCode === CC.keycodes.ENTER && textbox.val() === '' && expiredList.hasClass('expired')) {
                        e.preventDefault();
                        options.triggerSubmit(context);
                    }
                    // ...update and show the suggestion list on arrow-keys
                    if (e.keyCode === CC.keycodes.UP || e.keyCode === CC.keycodes.DOWN || e.keyCode === CC.keycodes.LEFT || e.keyCode === CC.keycodes.RIGHT) {
                        suggestionList.show();
                    }
                // If the suggestion list is already visible...
                } else {
                    var thisInputName = suggestionList.find('.selected').data('name');
                    // UP and DOWN move "active" suggestion
                    if (e.keyCode === CC.keycodes.UP) {
                        e.preventDefault();
                        if (!suggestionList.find('.selected').parent().is(':first-child')) {
                            suggestionList.find('.selected').removeClass('selected').parent().prev().children('a').addClass('selected');
                        }
                        return false;
                    }
                    if (e.keyCode === CC.keycodes.DOWN) {
                        e.preventDefault();
                        if (!suggestionList.find('.selected').parent().is(':last-child')) {
                            suggestionList.find('.selected').removeClass('selected').parent().next().children('a').addClass('selected');
                        }
                        return false;
                    }
                    // ENTER submits the form if textbox is empty and inputs have changed...
                    if (e.keyCode === CC.keycodes.ENTER) {
                        e.preventDefault();
                        if (textbox.val() === '' && expiredList.hasClass('expired')) {
                            options.triggerSubmit(context);
                        // ...otherwise, ENTER selects the "active" filter suggestion.
                        } else {
                            if (suggestionList.find('.selected').length) {
                                suggestionList.find('.selected').click();
                            }
                        }
                        return false;
                    }
                    // TAB auto-completes the "active" suggestion if it isn't already completed...
                    if (e.keyCode === CC.keycodes.TAB) {
                        if (thisInputName && textbox.val().toLowerCase() !== thisInputName.toLowerCase()) {
                            e.preventDefault();
                            textbox.val(thisInputName);
                            return false;
                        // ...otherwise, TAB selects the "active" filter suggestion (if exists)
                        } else if (suggestionList.find('.selected').length) {
                            e.preventDefault();
                            suggestionList.find('.selected').click();
                            suggestionList.show();
                            return false;
                        }
                    }
                    // RIGHT auto-completes the "active" suggestion if it isn't already completed
                    if (e.keyCode === CC.keycodes.RIGHT) {
                        if (thisInputName && textbox.val().toLowerCase() !== thisInputName.toLowerCase()) {
                            e.preventDefault();
                            textbox.val(thisInputName);
                            return false;
                        }
                    }
                    // ESC hides the suggestion list
                    if (e.keyCode === CC.keycodes.ESC) {
                        e.preventDefault();
                        suggestionList.hide();
                        return false;
                    }
                    return true;
                }
            })
            // If textbox still has fake placeholder text, remove it on click
            .click(function () {
                if (textbox.hasClass('placeholder') && options.fakePlaceholder) {
                    removeFakePlaceholder();
                }
            })
            .focus(function () {
                // Resets textbox data-clicked to "false" (becomes "true" when an autocomplete suggestion is clicked)
                textbox.data('clicked', false);
                // Adds fake placeholder on initial load (and moves cursor to start of textbox)
                if (textbox.val().length === 0 && textbox.hasClass('placeholder') && options.fakePlaceholder) {
                    textbox.val(placeholder);
                    textbox.get(0).setSelectionRange(0, 0);
                }
            })
            // On blur, removes fake placeholder text, and hides the suggestion
            // list after 150 ms if textbox data-clicked is "false"
            .blur(function () {
                function hideList() {
                    if (textbox.data('clicked') !== true) {
                        suggestionList.hide();
                        textbox.data('clicked', false);
                    }
                }
                if (options.fakePlaceholder) {
                    removeFakePlaceholder();
                }
                window.setTimeout(hideList, 150);
            })
            .focus();

        suggestionList.delegate('a', {
            // Adds ".selected" to suggestion on mouseover, removing ".selected" from other suggestions
            mouseover: function () {
                var thisSuggestion = $(this).addClass('selected'),
                    otherSuggestions = thisSuggestion.parent('li').siblings('li').find('a').removeClass('selected');
            },
            // Prevent the suggestion list from being hidden (by textbox blur event) when clicking a suggestion
            mousedown: function () {
                textbox.data('clicked', true);
            },
            click: function (e) {
                e.preventDefault();
                var thisCategory, existingNewInput, index, newInput,
                    thisID = $(this).data('id'),
                    thisCategoryName = $(this).data('category'),
                    inputName = $(this).data('name'),
                    thisInput = inputs.filter('[id^="id-' + thisCategoryName + '-"]' + '[value="' + thisID + '"]');
                if (thisInput.length) {
                    thisInput.prop('checked', true);
                    if (thisInput.data('originallyChecked') !== thisInput.is(':checked')) {
                        thisInput.data('state', 'changed');
                    }
                } else if ($(this).hasClass('new') && options.allowNew) {
                    if (options.multipleCategories) {
                        thisCategory = newInputList.filter(function () {
                            return $(this).data('name') === thisCategoryName;
                        });
                    } else {
                        thisCategory = newInputList;
                    }
                    existingNewInput = thisCategory.find(options.inputs + '[value="' + inputName + '"]');
                    index = thisCategory.find(options.inputs).length + 1;
                    thisCategoryName = thisCategory.data('name');
                    newInput = ich.autocomplete_new_input({
                        categoryName: thisCategoryName,
                        inputName: inputName,
                        index: index
                    });
                    if (existingNewInput.length) {
                        existingNewInput.prop('checked', true);
                        if (existingNewInput.data('originallyChecked') !== existingNewInput.is(':checked')) {
                            existingNewInput.data('state', 'changed');
                        }
                    } else {
                        if (thisCategory.find(options.newInputTextbox).length) {
                            thisCategory.removeClass('empty').find(options.newInputTextbox).before(newInput);
                        } else {
                            thisCategory.removeClass('empty').append(newInput);
                        }
                        $('#id-' + thisCategoryName + '-' + index.toString()).data('state', 'changed').data('originallyChecked', false).prop('checked', true);
                        inputs = inputs.add('#id-' + thisCategoryName + '-' + index.toString());
                    }
                }
                // Show/hide the form-actions as necessary, reset the textbox, and reset and hide the suggestion list
                if (options.hideFormActions) {
                    updateFormActions();
                }
                textbox.val(null);
                typedText = null;
                suggestionList.empty().hide();
            }
        });

        newInputTextbox.each(function () {
            $(this).keydown(function (e) {
                var thisTextbox = $(this),
                    thisText = thisTextbox.val(),
                    thisCategory = thisTextbox.closest(options.newInputList),
                    existingInput = thisCategory.find(options.inputs + '[value="' + thisText + '"]'),
                    categoryName = thisCategory.data('name'),
                    index = thisCategory.find(options.inputs).length + 1,
                    newInput = ich.autocomplete_new_input({
                        categoryName: categoryName,
                        inputName: thisText,
                        index: index
                    }),
                    addInput = function () {
                        newInput.insertBefore(thisTextbox);
                        $('#id-' + categoryName + '-' + index.toString()).data('state', 'changed').data('originallyChecked', false).prop('checked', true);
                        thisCategory.removeClass('empty');
                        inputs = inputs.add('#id-' + categoryName + '-' + index.toString());
                        updateFormActions();
                        thisTextbox.val(null);
                        thisText = null;
                    },
                    selectInput = function () {
                        existingInput.prop('checked', true);
                        if (existingInput.data('originallyChecked') !== existingInput.is(':checked')) {
                            existingInput.data('state', 'changed');
                        }
                        updateFormActions();
                        thisTextbox.val(null);
                        thisText = null;
                    };
                // ENTER submits the form if textbox is empty and inputs have changed...
                if (e.keyCode === CC.keycodes.ENTER) {
                    e.preventDefault();
                    if (thisText === '' && expiredList.hasClass('expired')) {
                        options.triggerSubmit(context);
                    }
                    if (thisText.length) {
                        // ...otherwise, if the filter already exists, ENTER selects it...
                        if (existingInput.length && !existingInput.is(':checked') && !thisCategory.find(options.inputs + ':checked').length) {
                            selectInput();
                            return false;
                        }
                        if (options.restrictNewInputs && passRestrictedNewInputs(thisCategory, thisText)) {
                            addInput();
                        }
                    }
                }
            });
        });
    };

    /* Setup plugin defaults */
    $.fn.customAutocomplete.defaults = {
        textbox: '#autocomplete-textbox',
        inputs: 'input[type="checkbox"]',
        formActions: '.form-actions',
        suggestionList: '.textual .suggest',
        inputList: '.visual',
        ajax: false,
        url: null,
        triggerSubmit: function (context) {
            context.find('.form-actions button[type="submit"]').click();
        },
        hideFormActions: false,
        multipleCategories: false,
        allowNew: false,
        newInputList: null,
        restrictNewInputs: false,
        newInputTextbox: null,
        fakePlaceholder: false,
        expiredList: '.visual'
    };
}(jQuery));