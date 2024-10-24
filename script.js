let categoryIdCounter = 1; // Global counter to give each category a unique ID
let currentTargetToDelete = null; // Track the current target for deletion
let currentMode = 'edit';  // Default mode is 'edit'
let isModalOpen = false;

///////////////////////////////////// ADDING COLUMNS START /////////////////////////////////////
document.querySelector('.add-column').addEventListener('click', function() {
    let currentColumnCount = document.querySelectorAll('.column').length;

    // Check if column limit is applied and enforced
    const columnLimitToggle = document.getElementById('toggleLimitColumns');
    const columnLimitInput = document.getElementById('columnLimitInput');
    if (columnLimitToggle && columnLimitToggle.checked) {
        const columnLimit = parseInt(columnLimitInput.value) || 0;
        if (currentColumnCount >= columnLimit) {
            showNotification(`Column limit of ${columnLimit} reached. You cannot add more columns.`, "warning");
            return; // Stop column creation
        }
    }
    const currentQuarter = getCurrentQuarter(); // Get the current quarter for the placeholder
    const newColumn = document.createElement('div');
    newColumn.classList.add('column');
    newColumn.setAttribute('draggable', 'true');  // Enable dragging
    newColumn.setAttribute('data-status', 'TENTATIVE'); // Set default status initially

    newColumn.innerHTML = `
        <div class="column-header">
            <input type="text" class="editable-column-title" placeholder="Column Name" />
            <div class="column-controls">
                <button class="toggle-column">-</button>
                <button class="delete-column">🗑️</button>
                <select class="editable-status">
                    <option value="TENTATIVE">TENTATIVE</option>
                    <option value="RELEASED">RELEASED</option>
                    <option value="COMMITTED">COMMITTED</option>
                </select>
                <div class="quarter-picker">
                    <input type="text" class="editable-date" placeholder="${currentQuarter}" readonly />
                    <input type="date" class="hidden-date-picker" />
                    <input type="text" class="calendaricon" placeholder="📅" readonly />
                </div>
            </div>
        </div>
        <div class="categories">
            <button class="add-category">+ Add Category</button>
        </div>`;

    document.querySelector('.roadmap').insertBefore(newColumn, this);

    // Apply global text color for "Add Category" button from settings
    const addCategoryButton = newColumn.querySelector('.add-category');
    addCategoryButton.style.backgroundColor = tempGlobalTextColor;
    addCategoryButton.style.color = tempButtonTextColor;

    // Apply text color and placeholder color to inputs and dropdowns
    const columnTitleInput = newColumn.querySelector('.editable-column-title');
    const statusSelect = newColumn.querySelector('.editable-status');
    const dateInput = newColumn.querySelector('.editable-date');

    // Set input text color and placeholder color
    columnTitleInput.style.color = tempButtonTextColor;
    columnTitleInput.style.setProperty('--placeholder-color', tempButtonTextColor);
    columnTitleInput.placeholder = `Column Name`; 

    // Apply styles to the status picker and other relevant inputs
    statusSelect.style.color = tempButtonTextColor;
    dateInput.style.color = tempButtonTextColor;
    dateInput.style.setProperty('--placeholder-color', tempButtonTextColor);

    // Force the placeholder to re-render
    const placeholderText = dateInput.placeholder;
    dateInput.placeholder = ''; // Temporarily remove the placeholder
    dateInput.placeholder = placeholderText; // Reapply the placeholder text

    // Apply focus on the new column's title input
    columnTitleInput.focus();

    // Set default column name if none is provided when losing focus
    columnTitleInput.addEventListener('blur', function() {
        if (!columnTitleInput.value.trim()) {
            columnTitleInput.value = '#Name';
        }
    });

    // Update column status when dropdown changes
    statusSelect.addEventListener('change', function() {
        const selectedStatus = statusSelect.value;
        newColumn.setAttribute('data-status', selectedStatus); 
    });

    // Delete column functionality
    newColumn.querySelector('.delete-column').addEventListener('click', function() {
        showConfirmationPopup("Are you sure you want to delete this column?", newColumn);
    });

    //Other function calls
    addCategoryFunctionality(newColumn);
    initStatusChangeListener(newColumn);
    applyColumnCollapse(newColumn.querySelector('.toggle-column'));
    attachDatePicker(newColumn.querySelector('.editable-date'), newColumn.querySelector('.hidden-date-picker'));
    updateLastModifiedDate();
    initDragAndDropColumns();
    saveToLocalStorage();
});

///////////////////////////////////// ADDIN COLUMNS END /////////////////////////////////////

///////////////////////////////////// Drag and Drop Column Functionality START /////////////////////////////////////
function initDragAndDropColumns() {
    const roadmap = document.querySelector('.roadmap');
    let draggedColumn = null;

    roadmap.querySelectorAll('.column').forEach(function (column) {
        column.addEventListener('dragstart', function () {
            draggedColumn = column;
            column.classList.add('dragging');
            addColumnShake();  

            setTimeout(() => {
                column.style.opacity = '0.5'; 
            }, 0);
        });

        column.addEventListener('dragend', function () {
            column.classList.remove('dragging');
            column.style.opacity = '1'; 
            removeColumnShake(); 
            draggedColumn = null;
        });

        column.addEventListener('dragover', function (e) {
            e.preventDefault();  // Prevent default to allow drop

            // Determine the correct drop position
            const afterElement = getDragAfterElement(roadmap, e.clientX);
            const dragging = document.querySelector('.dragging');
            if (afterElement == null) {
                roadmap.appendChild(dragging);  // Place at the end if no element is after
            } else {
                roadmap.insertBefore(dragging, afterElement);  // Insert dragged column before the hovered column
            }
        });
    });
}

// Function to determine the element to drop after based on mouse position
function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.column:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;  

        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Shake Effect for Columns
function addColumnShake() {
    document.querySelectorAll('.column').forEach(column => {
        if (!column.classList.contains('dragging')) {
            column.classList.add('shake');
        }
    });
}

function removeColumnShake() {
    document.querySelectorAll('.column').forEach(column => {
        column.classList.remove('shake');
    });
}

// Add CSS for shaking effect
const shakeStyle = document.createElement('style');
shakeStyle.innerHTML = `
    @keyframes shake {
        0% { transform: translate(1px, 1px) rotate(0deg); }
        10% { transform: translate(-1px, -2px) rotate(-1deg); }
        20% { transform: translate(-3px, 0px) rotate(1deg); }
        30% { transform: translate(3px, 2px) rotate(0deg); }
        40% { transform: translate(1px, -1px) rotate(1deg); }
        50% { transform: translate(-1px, 2px) rotate(-1deg); }
        60% { transform: translate(-3px, 1px) rotate(0deg); }
        70% { transform: translate(3px, 1px) rotate(-1deg); }
        80% { transform: translate(-1px, -1px) rotate(1deg); }
        90% { transform: translate(1px, 2px) rotate(0deg); }
        100% { transform: translate(1px, -2px) rotate(-1deg); }
    }

    .shake {
        animation: shake 0.5s infinite;
    }

    .dragging {
        opacity: 0.5;
    }
`;
document.head.appendChild(shakeStyle);

///////////////////////////////////// Drag and Drop Column Functionality END /////////////////////////////////////

///////////////////////////////////// Add Category START /////////////////////////////////////
//Add Category
function addCategoryFunctionality(column) {
    column.querySelector('.add-category').addEventListener('click', function() {
        let currentCategoryCount = column.querySelectorAll('.category').length;
        let totalCategoryCount = document.querySelectorAll('.category').length; 

        // Check if category limit per column is applied and enforced
        const categoryLimitToggle = document.getElementById('toggleLimitCategoriesInColumn');
        const categoryLimitInput = document.getElementById('categoryLimitInColumnInput');
        if (categoryLimitToggle && categoryLimitToggle.checked) {
            const categoryLimit = parseInt(categoryLimitInput.value) || 0;
            if (currentCategoryCount >= categoryLimit) {
                showNotification(`Category limit of ${categoryLimit} reached in this column. You cannot add more categories in this column.`, "warning");
                return; 
            }
        }

        // Check if global category limit is applied and enforced
        const globalCategoryLimitToggle = document.getElementById('toggleLimitAllCategories');
        const globalCategoryLimitInput = document.getElementById('allCategoriesLimitInput');
        if (globalCategoryLimitToggle && globalCategoryLimitToggle.checked) {
            const globalCategoryLimit = parseInt(globalCategoryLimitInput.value) || 0;
            if (totalCategoryCount >= globalCategoryLimit) {
                showNotification(`Global category limit of ${globalCategoryLimit} reached. You cannot add more categories.`, "warning");
                return; 
            }
        }
        const categoryId = 'category-' + Date.now(); // Create unique category ID
        const newCategory = document.createElement('div');
        newCategory.classList.add('category');
        newCategory.setAttribute('data-category-id', categoryId); // Set the unique ID
        newCategory.innerHTML = `
            <div class="category-header">
                <input type="text" class="editable-category-title" placeholder="Category Name" />
                <button class="delete-category">🗑️</button>
                <span class="entry-count">0 Entries</span>
                <button class="toggle-category">▼</button>
            </div>
            <div class="entries">
                <button class="add-entry">+ Add Entry</button>
            </div>`;

        // Apply the selected category color from the settings
        newCategory.style.backgroundColor = tempCategoryColor;

        // Apply global text color to the new category
        newCategory.querySelectorAll('.editable-category-title').forEach(input => {
            input.style.color = tempGlobalTextColor;
        });

        // Set the "Add Entry" button's background color from the settings
        const addEntryButton = newCategory.querySelector('.add-entry');
        addEntryButton.style.backgroundColor = tempGlobalTextColor;
        categoryTitleInput.style.color = tempButtonTextColor;
        addEntryButton.style.color = tempButtonTextColor;

        column.querySelector('.categories').insertBefore(newCategory, this);

        // Focus the category title input right after adding the new category
        const categoryTitleInput = newCategory.querySelector('.editable-category-title');
        categoryTitleInput.focus();

        // Set default category name if none is provided when losing focus
        categoryTitleInput.addEventListener('blur', function() {
            if (!categoryTitleInput.value.trim()) {
                categoryTitleInput.value = '#Category';
            }
        });

        // Handle category removal
        newCategory.querySelector('.delete-category').addEventListener('click', function() {
            showConfirmationPopup("Are you sure you want to delete this category?", newCategory);
        });

        addEntryFunctionality(newCategory);
        applyCategoryCollapse(newCategory.querySelector('.toggle-category'));
        updateLastModifiedDate();
        saveToLocalStorage();
    });
}

///////////////////////////////////// Add Category END /////////////////////////////////////
 
///////////////////////////////////// Add Entry START /////////////////////////////////////
// Add Entry
function addEntryFunctionality(category) {
    category.querySelector('.add-entry').addEventListener('click', function() {
        let currentEntryCount = category.querySelectorAll('.entry').length;
        let totalEntryCount = document.querySelectorAll('.entry').length; // Count all entries globally

        // Check if entry limit per category is applied and enforced
        const entryLimitToggle = document.getElementById('toggleLimitEntriesInCategory');
        const entryLimitInput = document.getElementById('entriesLimitInCategoryInput');
        if (entryLimitToggle && entryLimitToggle.checked) {
            const entryLimit = parseInt(entryLimitInput.value) || 0;
            if (currentEntryCount >= entryLimit) {
                showNotification(`Entry limit of ${entryLimit} reached in this category. You cannot add more entries in this category.`, "warning");
                return; 
            }
        }

        // Check if global entry limit is applied and enforced
        const globalEntryLimitToggle = document.getElementById('toggleLimitAllEntries');
        const globalEntryLimitInput = document.getElementById('allEntriesLimitInput');
        if (globalEntryLimitToggle && globalEntryLimitToggle.checked) {
            const globalEntryLimit = parseInt(globalEntryLimitInput.value) || 0;
            if (totalEntryCount >= globalEntryLimit) {
                showNotification(`Global entry limit of ${globalEntryLimit} reached. You cannot add more entries.`, "warning");
                return; 
            }
        }
        const modal = document.getElementById('customModal');
        const entryInput = document.getElementById('entryNameInput');
        const confirmButton = document.getElementById('confirmEntry');

        // Clear input on each open
        entryInput.value = '';

        // Show modal
        modal.style.display = 'flex';

        // Handle click on confirm button
        confirmButton.onclick = function() {
            const entryText = entryInput.value.trim() || '#Entry Name'; // Default if empty

            const newEntry = document.createElement('div');
            newEntry.classList.add('entry');
            newEntry.setAttribute('draggable', 'false');
            newEntry.innerHTML = `
                <div class="entry-header">
                    <h4>${entryText}</h4>
                    <button class="delete-entry">🗑️</button>
                </div>
                <p>Details about the entry...</p>`;

            // Apply entry text and background color
            newEntry.style.backgroundColor = tempEntryColor;
            newEntry.querySelector('h4').style.color = tempButtonTextColor;
            newEntry.querySelector('p').style.color = tempButtonTextColor;

            // Insert the entry before the "Add Entry" button
            category.querySelector('.add-entry').before(newEntry);

            // Attach event listener to open modal when entry is clicked
            newEntry.addEventListener('click', function() {
                document.querySelectorAll('.entry').forEach(e => e.classList.remove('editing-entry'));
                this.classList.add('editing-entry');
                openEntryModal(this);
            });

            // Handle entry removal
            newEntry.querySelector('.delete-entry').addEventListener('click', function(event) {
                event.stopPropagation(); // Prevent modal from opening
                const parentCategory = newEntry.closest('.category'); // Get the category of the entry
                showConfirmationPopup("Are you sure you want to delete this entry?", newEntry, true, parentCategory);
            });

            updateEntryCount(category);
            updateLastModifiedDate();
            saveToLocalStorage();

            // Close modal after adding
            modal.style.display = 'none';
        };

        // Close modal if clicked outside the content or the close button
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        };
        document.querySelector('.close-custom-modal').onclick = function() {
            modal.style.display = 'none';
        };
    });
}
  
  // Update entry count
  function updateEntryCount(category) {
    if (!category || !category.querySelector) {
        console.error("Category does not exist.");
        return;
    }
    const entryCount = category.querySelectorAll('.entry').length;
    category.querySelector('.entry-count').textContent = `${entryCount} Entries`;
}

///////////////////////////////////// Add Entry END /////////////////////////////////////

///////////////////////////////////// Expand / Collapse functionality START /////////////////////////////////////
// Expand all columns
document.getElementById('expand-all').addEventListener('click', function() {
    document.querySelectorAll('.column').forEach(column => {
        const categories = column.querySelector('.categories');
        const toggleButton = column.querySelector('.toggle-column');
        if (categories.style.display === 'none') {
            categories.style.display = 'flex'; 
            toggleButton.textContent = '-';
        }
    });
});

// Collapse all columns
document.getElementById('collapse-all').addEventListener('click', function() {
    document.querySelectorAll('.column').forEach(column => {
        const categories = column.querySelector('.categories');
        const toggleButton = column.querySelector('.toggle-column');
        if (categories.style.display !== 'none') {
            categories.style.display = 'none'; 
            toggleButton.textContent = '+'; 
        }
    });
});
  
  // Collapse Individual Column Functionality
  function applyColumnCollapse(button) {
    button.addEventListener('click', function() {
      const categories = this.closest('.column').querySelector('.categories');
      if (categories.style.display === 'none') {
        categories.style.display = 'flex';
        this.textContent = '-';
      } else {
        categories.style.display = 'none';
        this.textContent = '+';
      }
    });
  }
  
  document.querySelectorAll('.toggle-column').forEach(applyColumnCollapse);
  
  // Collapse Category Functionality
  function applyCategoryCollapse(button) {
    button.addEventListener('click', function() {
      const entries = this.closest('.category').querySelector('.entries');
      if (entries.style.display === 'none') {
        entries.style.display = 'flex';
        this.textContent = '▼';
      } else {
        entries.style.display = 'none';
        this.textContent = '▲';
      }
    });
  }

///////////////////////////////////// Expand / Collapse functionality END /////////////////////////////////////

///////////////////////////////////// HELPER FUNCTIONS START /////////////////////////////////////
// Get the current quarter and year
function getCurrentQuarter() {
    const today = new Date();
    return calculateQuarter(today);
}

// Function to calculate the quarter from the selected date
function calculateQuarter(date) {
    const month = date.getMonth(); // 0-indexed, so Jan = 0, Feb = 1, etc.
    const year = date.getFullYear();

    let quarter;
    if (month >= 0 && month <= 2) {
        quarter = 'Q1';
    } else if (month >= 3 && month <= 5) {
        quarter = 'Q2';
    } else if (month >= 6 && month <= 8) {
        quarter = 'Q3';
    } else {
        quarter = 'Q4';
    }

    return `${quarter} ${year}`;
}

// Helper function to format the date from yyyy-mm-dd to dd/mm/yyyy
function formatDateToDDMMYYYY(dateString) {
    if (!dateString) return null;

    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
}

// Function to attach a date picker and handle the quarter display
function attachDatePicker(dateInput, hiddenDatePicker) {
    // When calendar icon (hidden-date-picker) is clicked, open the date picker
    hiddenDatePicker.addEventListener('change', function() {
        const selectedDate = new Date(this.value);
        const quarter = calculateQuarter(selectedDate);
        // Update the visible input with the quarter and year
        dateInput.value = quarter;
    });

    // Attach click event to the visible quarter input to trigger the hidden date picker
    dateInput.addEventListener('click', function() {
        hiddenDatePicker.click(); // Trigger the hidden date input
    });
}

// Function to format and update the date
function updateLastModifiedDate() {
    const today = new Date();
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-US', options);

    // Custom format to add "st", "nd", "rd", "th" to the day
    const day = today.getDate();
    let daySuffix;
    if (day === 1 || day === 21 || day === 31) {
        daySuffix = 'st';
    } else if (day === 2 || day === 22) {
        daySuffix = 'nd';
    } else if (day === 3 || day === 23) {
        daySuffix = 'rd';
    } else {
        daySuffix = 'th';
    }

    // Final format: "Oct. 2nd 2024"
    const formattedText = `${today.toLocaleString('en', { month: 'short' })}. ${day}${daySuffix} ${today.getFullYear()}`;

    // Update the element with the formatted date
    document.querySelector('.last-updated').textContent = `Updated: ${formattedText}`;
}

// Function to show the loading screen and automatically hide it after the specified delay
function showLoadingScreen(delay = 1000) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = 'flex'; 
    loadingOverlay.classList.add('show'); 

    // Hide the loading screen after the specified delay
    setTimeout(() => {
        loadingOverlay.classList.remove('show'); 
        setTimeout(() => {
            loadingOverlay.style.display = 'none'; 
        }, 500); // Allow time for the fade-out transition
    }, delay); // Delay (in milliseconds) before starting the fade-out
}

// ENHANCED CUSTOM NOTIFICATION SYSTEM
function showNotification(message, type = "info", duration = 3000) {
    // Remove any existing notifications
    const existingNotification = document.getElementById('notification-box');
    if (existingNotification) {
        existingNotification.remove();
    }

    // Create a new notification box
    const notificationBox = document.createElement('div');
    notificationBox.id = 'notification-box';
    notificationBox.textContent = message;

    // Apply common styles
    notificationBox.style.position = 'fixed';
    notificationBox.style.top = '20px'; 
    notificationBox.style.left = '50%';
    notificationBox.style.transform = 'translateX(-50%)'; 
    notificationBox.style.zIndex = '1000';
    notificationBox.style.padding = '15px 20px';
    notificationBox.style.fontSize = '16px';
    notificationBox.style.borderRadius = '8px';
    notificationBox.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.2)';
    notificationBox.style.display = 'flex';
    notificationBox.style.alignItems = 'center';
    notificationBox.style.justifyContent = 'space-between';
    notificationBox.style.opacity = '0'; 
    notificationBox.style.transition = 'opacity 0.5s ease, top 0.5s ease';

    // Custom styles based on notification type
    switch (type) {
        case 'success':
            notificationBox.style.backgroundColor = '#28a745';
            notificationBox.style.color = 'white';
            break;
        case 'error':
            notificationBox.style.backgroundColor = '#dc3545';
            notificationBox.style.color = 'white';
            break;
        case 'warning':
            notificationBox.style.backgroundColor = '#ffc107';
            notificationBox.style.color = '#212529';
            break;
        case 'info':
        default:
            notificationBox.style.backgroundColor = '#007bff';
            notificationBox.style.color = 'white';
            break;
    }

    // Close button
    const closeButton = document.createElement('span');
    closeButton.textContent = '×';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginLeft = '15px';
    closeButton.style.fontSize = '18px';
    closeButton.style.color = 'white';
    closeButton.style.userSelect = 'none';
    closeButton.addEventListener('click', function () {
        notificationBox.style.opacity = '0';
        notificationBox.style.top = '0px'; 
        setTimeout(() => {
            notificationBox.remove();
        }, 500); // Delay removal after animation
    });

    // Append close button to notification
    notificationBox.appendChild(closeButton);

    // Append the notification box to the body
    document.body.appendChild(notificationBox);

    // Trigger the animation to slide in and fade in
    setTimeout(() => {
        notificationBox.style.opacity = '1';
        notificationBox.style.top = '30px'; 
    }, 10); 

    // Auto-remove the notification after the duration
    setTimeout(() => {
        notificationBox.style.opacity = '0';
        notificationBox.style.top = '0px'; 
        setTimeout(() => {
            notificationBox.remove();
        }, 500); 
    }, duration); 
}

///////////////////////////////////// HELPER FUNCTIONS END /////////////////////////////////////

///////////////////////////////////// ENTRY MODAL START /////////////////////////////////////
function openEntryModal(entry) {
    const modal = document.getElementById('entryModal');
    const titleField = document.getElementById('modalTitle');
    const categoryField = document.getElementById('modalCategory');
    const descriptionField = document.getElementById('modalDescription');
    const imagePreview = document.getElementById('modalImagePreview');
    const removeImageButton = document.getElementById('removeImageButton');
    const statusField = document.getElementById('modalStatus');  // For status
    const checklistSection = document.getElementById('checklist-section');
    const overlay = document.querySelector('.modal-overlay');

    // Ensure modal exists and is hidden by default
    if (!modal || !overlay) {
        console.error('Modal or overlay not found!');
        return;
    }

    // Clear checklist section
    checklistSection.innerHTML = ''; // Clear previous checklists when opening the modal

    // Clear any previous image when opening the modal for a new entry
    imagePreview.src = ""; 
    imagePreview.style.display = "none";
    removeImageButton.style.display = "none";

    // Show overlay and modal
    overlay.style.display = 'block';
    modal.style.display = 'flex';

    // Set maxlength for the title input
    titleField.setAttribute('maxlength', '57');

    // Populate title and description from the entry
    titleField.value = entry.querySelector('h4').textContent || "";
    const fullDescription = entry.dataset.fullDescription || entry.querySelector('p').textContent || "";
    descriptionField.value = fullDescription;

    // Populate the category dropdown with `data-category-id`
    const parentCategory = entry.closest('.category').getAttribute('data-category-id');
    categoryField.innerHTML = ''; // Clear previous options
    document.querySelectorAll('.category').forEach(category => {
        const categoryId = category.getAttribute('data-category-id');
        const categoryName = category.querySelector('.editable-category-title').value;
        const selected = categoryId === parentCategory ? 'selected' : '';
        categoryField.innerHTML += `<option value="${categoryId}" ${selected}>${categoryName}</option>`;
    });

    // Get the correct image for the entry, ensuring it's tied to the specific entry dataset
    const imageSrc = entry.dataset.image || "";  

    // Always reset the remove image button to 'none' initially, ensuring no previous state affects it
    removeImageButton.style.display = 'none';

    // Check if there is an image
    if (imageSrc) {
        imagePreview.src = imageSrc;   
        imagePreview.style.display = 'block'; 

        // Only show the "X" remove button in edit mode when there's an image
        if (currentMode === 'edit') {
            removeImageButton.style.display = 'block';  
        }
    } else {
        imagePreview.style.display = 'none'; 
    }

    // Load the checklists for this entry
    checklistSection.innerHTML = ''; 
    const checklistsData = entry.dataset.checklists ? JSON.parse(entry.dataset.checklists) : [];
    checklistsData.forEach(checklistData => {
        const newChecklist = document.createElement('div');
        newChecklist.classList.add('checklist');
        newChecklist.innerHTML = `
            <input type="text" class="checklist-title" value="${checklistData.title}">
            <button class="delete-checklist">🗑️</button>
            <div class="checklist-items"></div>
            <button class="add-checklist-item">+ Add Item</button> <!-- Add the "Add Item" button back -->
            <progress class="checklist-progress" value="0" max="100"></progress>
        `;

        // Append checklist items
        const checklistItemsDiv = newChecklist.querySelector('.checklist-items');
        checklistData.items.forEach(item => {
            const newItem = document.createElement('div');
            newItem.classList.add('checklist-item');
            newItem.innerHTML = `
                <input type="checkbox" class="checklist-checkbox" ${item.checked ? 'checked' : ''}>
                <input type="text" class="checklist-item-text" value="${item.text}">
                <button class="delete-checklist-item">🗑️</button>
            `;

            // Append the new item to the checklist
            checklistItemsDiv.appendChild(newItem);

            // Handle item deletion
            newItem.querySelector('.delete-checklist-item').addEventListener('click', function() {
                newItem.remove();
                updateChecklistProgress(newChecklist);
            });

            // Update progress bar when checkbox is clicked
            newItem.querySelector('.checklist-checkbox').addEventListener('change', function() {
                updateChecklistProgress(newChecklist);
            });
        });

        // Re-add the "Add Item" button functionality
        const addItemButton = newChecklist.querySelector('.add-checklist-item');
        addItemButton.style.backgroundColor = tempModalButtonsColor; 
        addItemButton.style.color = tempModalTextColor
        addItemButton.addEventListener('click', function() {
            const newItem = document.createElement('div');
            newItem.classList.add('checklist-item');
            newItem.innerHTML = `
                <input type="checkbox" class="checklist-checkbox">
                <input type="text" class="checklist-item-text" placeholder="Checklist Item">
                <button class="delete-checklist-item">🗑️</button>
            `;

            // Append the new item to the checklist
            checklistItemsDiv.appendChild(newItem);

            // Handle item deletion
            newItem.querySelector('.delete-checklist-item').addEventListener('click', function() {
                newItem.remove();
                updateChecklistProgress(newChecklist);
            });

            // Update progress bar when checkbox is clicked
            newItem.querySelector('.checklist-checkbox').addEventListener('change', function() {
                updateChecklistProgress(newChecklist);
            });
        });

        checklistSection.appendChild(newChecklist);
        updateChecklistProgress(newChecklist);

        // Handle checklist deletion
        newChecklist.querySelector('.delete-checklist').addEventListener('click', function() {
            newChecklist.remove();
        });
    });

    // Get the status from the column header and set it as text in the status ribbon
    const columnStatus = entry.closest('.column').querySelector('.editable-status').value || 'IN DEVELOPMENT';
    statusField.textContent = columnStatus;  // Set the status text

    modal.style.display = 'flex'; 

    // Call toggleMode(currentMode) after modal is opened**
    toggleMode(currentMode);  
}

    // Trigger file input when Add Image is clicked
    document.getElementById('addImageButton').addEventListener('click', function() {
    document.getElementById('modalImageUpload').click();
    });

    // Handle image upload
    document.getElementById('modalImageUpload').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('modalImagePreview').src = e.target.result;
                document.getElementById('modalImagePreview').style.display = 'block';
                document.getElementById('removeImageButton').style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    // Event listener for modal close button
    const closeButton = document.querySelector('.close-modal');
    const overlay = document.querySelector('.modal-overlay');
    
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            const modal = document.getElementById('entryModal');
            if (modal && overlay) {
                modal.style.display = 'none'; // Hide modal
                overlay.style.display = 'none'; // Hide overlay
                isModalOpen = false;
            }
        });
    }

// Save button functionality
document.getElementById('saveEntryButton').addEventListener('click', function() {
    const modal = document.getElementById('entryModal');
    const entryTitle = document.getElementById('modalTitle').value;
    const entryCategory = document.getElementById('modalCategory').value; 
    const entryDescription = document.getElementById('modalDescription').value;
    const entryImage = document.getElementById('modalImagePreview').src;

    // Get the currently edited entry
    const currentEntry = document.querySelector('.editing-entry'); 
    const originalCategory = currentEntry.dataset.category; 

    // Update the entry with new title and category data
    currentEntry.querySelector('h4').textContent = entryTitle;
    currentEntry.dataset.category = entryCategory; 

    // Now we search for the correct category by its unique data-id
    const targetCategory = document.querySelector(`.category[data-category-id="${entryCategory}"]`);
    const originalCategoryElement = document.querySelector(`.category[data-category-id="${originalCategory}"]`);

    // Move entry to the new category if it is different from the original
    if (targetCategory && originalCategory !== entryCategory) {
        const newCategoryEntries = targetCategory.querySelector('.entries');
        const addEntryButton = newCategoryEntries.querySelector('.add-entry'); 
        if (newCategoryEntries && currentEntry.parentNode !== newCategoryEntries) {
            newCategoryEntries.insertBefore(currentEntry, addEntryButton);

            // Update entry counts for both original and target categories
            if (originalCategoryElement) {
                updateEntryCount(originalCategoryElement); 
            }
            updateEntryCount(targetCategory);
        }
    } else {
        console.log('Category not found with the identifier:', entryCategory);
    }

    // Update or remove the image based on whether it is visible or not
    if (entryImage && document.getElementById('modalImagePreview').style.display !== 'none') {
        let entryImageElement = currentEntry.querySelector('img');
        if (!entryImageElement) {
            entryImageElement = document.createElement('img');
            currentEntry.insertBefore(entryImageElement, currentEntry.querySelector('p'));
        }
        entryImageElement.src = entryImage;

        // Update the dataset with the new image
        currentEntry.dataset.image = entryImage;  
    } else {
        const entryImageInDashboard = currentEntry.querySelector('img');
        if (entryImageInDashboard) {
            entryImageInDashboard.remove(); 
        }

        // Remove the image from the dataset
        delete currentEntry.dataset.image;
    }

    // Store the full description as a data attribute to prevent losing it
    currentEntry.dataset.fullDescription = entryDescription;

    // Save checklist data
    const checklists = [];
    document.querySelectorAll('.checklist').forEach(checklist => {
        const title = checklist.querySelector('.checklist-title').value;
        const items = [];
        checklist.querySelectorAll('.checklist-item').forEach(item => {
            const text = item.querySelector('.checklist-item-text').value;
            const checked = item.querySelector('.checklist-checkbox').checked;
            items.push({ text, checked });
        });
        checklists.push({ title, items });
    });
    currentEntry.dataset.checklists = JSON.stringify(checklists); 

    // Checklist presence detection
    const checklistSection = document.getElementById('checklist-section');
    const hasChecklist = checklistSection && checklistSection.querySelector('.checklist');

    // If there is a checklist, add an icon; otherwise, remove it
    let checklistIcon = currentEntry.querySelector('.checklist-icon');
    if (hasChecklist) {
        if (!checklistIcon) {
            checklistIcon = document.createElement('span');
            checklistIcon.classList.add('checklist-icon');
            checklistIcon.textContent = '☑';
            currentEntry.appendChild(checklistIcon); 
        }
    } else if (checklistIcon) {
        checklistIcon.remove(); 
    }

    // Update the truncated description for the preview
    const truncatedDescription = entryDescription.length > 50 ? entryDescription.substring(0, 50) + '...' : entryDescription;
    currentEntry.querySelector('p').textContent = truncatedDescription;

    modal.style.display = 'none';
    overlay.style.display = 'none';
    isModalOpen = false;
    updateLastModifiedDate();
    saveToLocalStorage();
    showNotification(`Entry Saved!`, "success");
});


    // Remove image functionality
    document.getElementById('removeImageButton').addEventListener('click', function() {
        const imagePreview = document.getElementById('modalImagePreview');
        const removeImageButton = document.getElementById('removeImageButton');
        const fileInput = document.getElementById('modalImageUpload'); 

        // Hide the image preview and show the "Add Image" label
        imagePreview.style.display = 'none'; 
        removeImageButton.style.display = 'none'; 

        // Clear the image from the dataset when the remove button is clicked
        const currentEntry = document.querySelector('.editing-entry');
        delete currentEntry.dataset.image; 
        fileInput.value = '';
});

// Initialize checklist functionality
function initChecklistFunctionality() {
    const checklistSection = document.getElementById('checklist-section');
    const addChecklistButton = document.getElementById('addChecklistButton');

    // Event listener for "Add Checklist" button
    addChecklistButton.addEventListener('click', function() {
        const newChecklist = document.createElement('div');
        newChecklist.classList.add('checklist');
        const checklistId = 'checklist-' + Date.now();

        // Apply modal settings colors
        const checklistBackgroundColor = tempModalBackgroundColor;
        const checklistTextColor = tempModalTextColor; 

        // Checklist structure
        newChecklist.innerHTML = `
            <input type="text" class="checklist-title" placeholder="Checklist Name" style="background-color: ${checklistBackgroundColor}; color: ${checklistTextColor};">
            <button class="delete-checklist" style="background-color: ${checklistBackgroundColor}; color: ${checklistTextColor};">🗑️</button>
            <div class="checklist-items">
                <button class="add-checklist-item" style="background-color: ${checklistBackgroundColor}; color: ${checklistTextColor};">+ Add Item</button>
            </div>
            <progress class="checklist-progress" value="0" max="100"></progress>
        `;

        // Add the new checklist to the modal
        checklistSection.appendChild(newChecklist);

        // Add functionality to the "Add Item" button within the checklist
        const addItemButton = newChecklist.querySelector('.add-checklist-item');
        addItemButton.addEventListener('click', function() {
            addItemButton.style.backgroundColor = tempModalButtonsColor;
            addItemButton.style.color = tempModalTextColor;
            const checklistItemsDiv = newChecklist.querySelector('.checklist-items');
            const newItem = document.createElement('div');
            newItem.classList.add('checklist-item');
            newItem.innerHTML = `
                <input type="checkbox" class="checklist-checkbox">
                <input type="text" class="checklist-item-text" placeholder="Checklist Item">
                <button class="delete-checklist-item">🗑️</button>
            `;

            // Append the new item to the checklist
            checklistItemsDiv.insertBefore(newItem, addItemButton);

            // Handle item deletion
            newItem.querySelector('.delete-checklist-item').addEventListener('click', function() {
                newItem.remove();
                updateChecklistProgress(newChecklist);
            });

            // Update progress bar when checkbox is clicked
            newItem.querySelector('.checklist-checkbox').addEventListener('change', function() {
                updateChecklistProgress(newChecklist);
            });
        });

        // Handle checklist deletion
        newChecklist.querySelector('.delete-checklist').addEventListener('click', function() {
            newChecklist.remove();
        });
    });
}

// Update checklist progress bar
function updateChecklistProgress(checklist) {
    const items = checklist.querySelectorAll('.checklist-item');
    const checkedItems = checklist.querySelectorAll('.checklist-checkbox:checked');
    const progress = (items.length > 0) ? (checkedItems.length / items.length) * 100 : 0;
    checklist.querySelector('.checklist-progress').value = progress;
}


// Function to update progress bar based on checked items
function updateChecklistProgress(checklist) {
    const items = checklist.querySelectorAll('.checklist-item');
    const checkboxes = checklist.querySelectorAll('.checklist-checkbox');
    const checkedItems = checklist.querySelectorAll('.checklist-checkbox:checked').length;
    const progressBar = checklist.querySelector('.checklist-progress');

    if (items.length > 0) {
        const progress = (checkedItems / items.length) * 100;
        progressBar.value = progress;
    } else {
        progressBar.value = 0; 
    }
}

// Call the initialization function when the modal is opened
document.addEventListener('DOMContentLoaded', function() {
    initChecklistFunctionality();
});

///////////////////////////////////// ENTRY MODAL END /////////////////////////////////////

///////////////////////////////////// DELETE CONFIRMATION POPUP START /////////////////////////////////////
// Function to show the confirmation popup
function showConfirmationPopup(message, targetElement, isEntry = false, parentCategory = null) {
    const popup = document.getElementById('confirmationPopup');
    const messageField = document.getElementById('confirmationMessage');
    const overlay = document.querySelector('.modal-overlay');
    messageField.textContent = message; 
    currentTargetToDelete = { element: targetElement, isEntry: isEntry, parentCategory: parentCategory };  
    popup.style.display = 'block';  
    overlay.style.display = 'block';
}

// Hide confirmation popup
function hideConfirmationPopup() {
    document.getElementById('confirmationPopup').style.display = 'none';
    document.querySelector('.modal-overlay').style.display = 'none'
}

// Add click event listeners for Confirm and Cancel
document.getElementById('confirmDelete').addEventListener('click', function() {
    if (currentTargetToDelete && currentTargetToDelete.element) {
        currentTargetToDelete.element.remove();

        // Only update entry count if the target is an entry
        if (currentTargetToDelete.isEntry && currentTargetToDelete.parentCategory) {
            updateEntryCount(currentTargetToDelete.parentCategory);
        }

        updateLastModifiedDate();  
    }
    hideConfirmationPopup();
    saveToLocalStorage();
});

document.getElementById('cancelDelete').addEventListener('click', function() {
    hideConfirmationPopup();
});

// Adjust Delete Column Functionality
function setupDeleteColumn(newColumn) {
    newColumn.querySelector('.delete-column').addEventListener('click', function() {
        showConfirmationPopup("Are you sure you want to delete this column?", newColumn);
    });
}

// Adjust Delete Category Functionality
function setupDeleteCategory(newCategory) {
    newCategory.querySelector('.delete-category').addEventListener('click', function() {
        showConfirmationPopup("Are you sure you want to delete this category?", newCategory);
    });
}

// Adjust Delete Entry Functionality
function setupDeleteEntry(newEntry, category) {
    newEntry.querySelector('.delete-entry').addEventListener('click', function(event) {
        event.stopPropagation(); 
        showConfirmationPopup("Are you sure you want to delete this entry?", newEntry);
    });
}

///////////////////////////////////// DELETE CONFIRMATION POPUP END /////////////////////////////////////

///////////////////////////////////// UPDATE COLUMN COLORS BASED ON STATUS START /////////////////////////////////////
// Function to update column background based on status (uses user-defined colors from settings)
function updateColumnBackground(column, status) {
    // Ensure status is lowercase to match the keys in tempDeliverableColors
    const statusLowerCase = status.toLowerCase();
    
    // Fetch the color from tempDeliverableColors, fall back to a default color if not found
    let newBackgroundColor = tempDeliverableColors[statusLowerCase] || "#1f2833"; // Default fallback color (theme background)

    // Apply the background color to the column
    column.style.backgroundColor = newBackgroundColor;
}

// Function to initialize status change listener
function initStatusChangeListener(column) {
    const statusDropdown = column.querySelector('.editable-status');

    // Listen for changes on the status dropdown
    statusDropdown.addEventListener('change', function() {
        const selectedStatus = statusDropdown.value;
        updateColumnBackground(column, selectedStatus); 
    });

    // Call the function on initialization to apply background for the current status
    const initialStatus = statusDropdown.value;
    updateColumnBackground(column, initialStatus);
}
///////////////////////////////////// UPDATE COLUMN COLORS BASED ON STATUS END /////////////////////////////////////

///////////////////////////////////// CAVEATS POPUP START /////////////////////////////////////
document.addEventListener('DOMContentLoaded', function() {
    // Function to open the roadmap caveats popup
    function openRoadmapCaveatsPopup() {
        const modal = document.getElementById('roadmapCaveatsPopup');
        if (modal) {
            modal.style.display = 'flex';  // Display the modal
        } else {
            console.error('Modal not found.');
        }
    }

    // Function to close the roadmap caveats popup
    function closeRoadmapCaveatsPopup() {
        const modal = document.getElementById('roadmapCaveatsPopup');
        if (modal) {
            modal.style.display = 'none';  
        } else {
            console.error('Modal not found.');
        }
    }

    // Event listener for Caveats popup button
    const sidebarButton = document.getElementById('sidebar-button2');
    if (sidebarButton) {
        sidebarButton.addEventListener('click', function() {
            openRoadmapCaveatsPopup();
        });
    } else {
        console.error('#sidebar-button2 not found.');
    }

    // Event listener for close button (I GOT IT)
    const closePopupButton = document.getElementById('closeRoadmapCaveatsPopup');
    if (closePopupButton) {
        closePopupButton.addEventListener('click', function() {
            closeRoadmapCaveatsPopup();
        });
    } else {
        console.error('#closeRoadmapCaveatsPopup not found.');
    }

    // Event listener for close (X) button
    const closeModalButton = document.querySelector('.caveats-close-modal');
    if (closeModalButton) {
        closeModalButton.addEventListener('click', function() {
            closeRoadmapCaveatsPopup();
        });
    } else {
        console.error('.caveats-close-modal not found.');
    }

    // Close the popup if clicking outside of modal content
    window.onclick = function(event) {
        const modal = document.getElementById('roadmapCaveatsPopup');
        if (event.target === modal) {
            closeRoadmapCaveatsPopup();
        }
    };
});
///////////////////////////////////// CAVEATS POPUP END /////////////////////////////////////

///////////////////////////////////// TOGGLE MODE START /////////////////////////////////////
// TOGGLE READ ONLY/EDIT MODE
function toggleMode(mode) {
    const isPreview = (mode === 'preview');
    const editButton = document.getElementById('sidebar-button1'); // Edit button
    const previewButton = document.getElementById('sidebar-button3'); // Preview button
    const roadmapHeader = document.querySelector('.roadmap-header h1'); // Header text element

        // Show loading screen for 1 second
        showLoadingScreen(1000);    
    
        // Update UI based on mode
        if (mode === 'edit') {
            // Add active class to edit button, remove from preview button
            editButton.classList.add('active');
            previewButton.classList.remove('active');
    
            // Update header text
            roadmapHeader.textContent = 'EDIT VIEW';
    
        } else if (mode === 'preview') {
            // Add active class to preview button, remove from edit button
            previewButton.classList.add('active');
            editButton.classList.remove('active');
    
            // Update header text
            roadmapHeader.textContent = 'RELEASE VIEW';
        }

    // Hide or show the "Add Column" button
    document.querySelector('.add-column').style.display = isPreview ? 'none' : 'block';
    
    // Hide or show "Add Category" buttons
    document.querySelectorAll('.add-category').forEach(button => {
        button.style.display = isPreview ? 'none' : 'block';
    });

    // Hide or show "Add Entry" buttons
    document.querySelectorAll('.add-entry').forEach(button => {
        button.style.display = isPreview ? 'none' : 'block';
    });

    // Disable or enable column and category inputs
    document.querySelectorAll('.editable-column-title, .editable-category-title').forEach(input => {
        input.readOnly = isPreview;
    });

    // Disable or enable the status dropdown
    document.querySelectorAll('.editable-status').forEach(select => {
        select.disabled = isPreview;
    });

    // Disable the date picker for quarter date
    document.querySelectorAll('.editable-date, .hidden-date-picker').forEach(dateInput => {
        dateInput.disabled = isPreview;
    });

    // Hide or show column, category, and entry remove buttons
    document.querySelectorAll('.delete-column, .delete-category, .delete-entry').forEach(button => {
        button.style.display = isPreview ? 'none' : 'block';
    });

    // Disable or enable the modals' inputs (Title, Description, Category dropdown)
    document.querySelectorAll('#modalTitle, #modalDescription, #modalCategory').forEach(input => {
        input.readOnly = isPreview;
    });

    // Hide or show the modal sidebar (Add Image, Add Checklist)
    const modalSidebar = document.querySelector('.modal-sidebar');
    if (modalSidebar) {
        modalSidebar.style.display = isPreview ? 'none' : 'block';
    }

    // Adjust modal buttons (hide or show Save button in modal)
    const saveButton = document.getElementById('saveEntryButton');
    if (saveButton) {
        saveButton.style.display = isPreview ? 'none' : 'block';
    }

    // **Log and Hide the remove image "X" button inside the modal**
    if (isModalOpen) {
        const removeImageButton = document.getElementById('removeImageButton');

        if (currentMode === 'preview') {
            removeImageButton.style.display = 'none';
        } else if (currentMode === 'edit') {
            const imageSrc = document.getElementById('modalImagePreview').src;
            if (imageSrc) {
                removeImageButton.style.display = 'block';  // Show only if there’s an image
            }
        }
    }

    // **Log and Hide checklist "delete" buttons and make the checklist title read-only**
    document.querySelectorAll('.checklist').forEach(checklist => {
        const deleteChecklistButton = checklist.querySelector('.delete-checklist');
        const checklistTitle = checklist.querySelector('.checklist-title');

        if (deleteChecklistButton) {
            deleteChecklistButton.style.display = isPreview ? 'none' : 'block';
        }
        if (checklistTitle) {
            checklistTitle.readOnly = isPreview;
        }

        // **Disable checklist items (checkboxes and text fields) in preview mode
        checklist.querySelectorAll('.checklist-item').forEach(item => {
            const checkbox = item.querySelector('.checklist-checkbox');
            const textField = item.querySelector('.checklist-item-text');

            if (checkbox) {
                checkbox.disabled = isPreview; 
            }
            if (textField) {
                textField.readOnly = isPreview; 
            }
        });
    });

    // Hide checklist item delete buttons
    document.querySelectorAll('.delete-checklist-item').forEach(button => {
        button.style.display = isPreview ? 'none' : 'block';
    });

    // Hide or show the "Add Item" buttons for checklists based on mode
    document.querySelectorAll('.add-checklist-item').forEach(button => {
        button.style.display = isPreview ? 'none' : 'block';
    });

    // Show or hide the gear icon based on the mode
    const settingsButton = document.getElementById('settingsButton');
    if (settingsButton) {
        settingsButton.style.display = isPreview ? 'none' : 'block'; 
    }

    // Disable drag-and-drop functionality for columns and entries in Preview Mode
    const draggableElements = document.querySelectorAll('.column, .entry');
    draggableElements.forEach(element => {
        element.setAttribute('draggable', !isPreview);  // Enable or disable drag-and-drop
    });
    
    //Adjust aspect of preview mode entry modal
    adjustModalElements(mode);
}


//Switch to Edit mode
document.getElementById('sidebar-button1').addEventListener('click', function() {
    currentMode = 'edit';  
    toggleMode(currentMode);  
});

// Switch to Preview Mode
document.getElementById('sidebar-button3').addEventListener('click', function() {
    currentMode = 'preview';  
    toggleMode(currentMode);  
});

// Helper function to adjust aspect of elements in preview mode.
function adjustModalElements(mode) {
    const modal = document.getElementById('entryModal');
    const statusRibbon = document.querySelector('.status-ribbon');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalImage = document.getElementById('modalImagePreview');
    const checklistSection = document.querySelector('.checklist');
    const checklistTitle = document.querySelector('.checklist-title');
    const checklistItem = document.querySelector('.checklist-item-text');

    // Adjust element styles based on mode
    if (mode === 'preview') {
        if (statusRibbon) statusRibbon.style.maxWidth = '950px';
        if (modalTitle) modalTitle.style.maxWidth = '945px';
        if (modalDescription) modalDescription.style.maxWidth = '945px';
        if (modalImage) modalImage.style.maxWidth = '945px';
        if (checklistSection) checklistSection.style.maxWidth = '945px'; 
        if (checklistTitle) checklistTitle.style.width = '98%';
        if (checklistItem) checklistItem.style.width = '90%';
    } else if (mode === 'edit') {
        if (statusRibbon) statusRibbon.style.maxWidth = '765px';
        if (modalTitle) modalTitle.style.maxWidth = '765px';
        if (modalDescription) modalDescription.style.maxWidth = '765px';
        if (modalImage) modalImage.style.maxWidth = '765px';
        if (checklistSection) checklistSection.style.maxWidth = '765px';
        if (checklistTitle) checklistTitle.style.width = '90%';
        if (checklistItem) checklistItem.style.width = '90%';
    }
}

// Automatically trigger "Edit view" when the page loads
document.addEventListener('DOMContentLoaded', function() {
    toggleMode('edit');
});

///////////////////////////////////// TOGGLE MODE END /////////////////////////////////////

//////////////////////////// SETTINGS MODAL ///////////////////////////////

// Open settings modal
const settingsButton = document.getElementById('settingsButton');
if (settingsButton) {
    settingsButton.addEventListener('click', function () {
        const settingsModal = document.getElementById('settingsmodal');
        if (settingsModal) settingsModal.style.display = 'flex';
        updateUI();  
    });
}

// Close settings modal
const closeSettingsButton = document.getElementById('closeSettingsButton');
if (closeSettingsButton) {
    closeSettingsButton.addEventListener('click', function () {
        const settingsModal = document.getElementById('settingsmodal');
        if (settingsModal) settingsModal.style.display = 'none';
    });
}

// Event listener to switch between settings in settings popup
document.querySelectorAll('.settings-sidebar li').forEach(li => {
    li.addEventListener('click', function() {
        const selectedSetting = this.textContent.trim().toLowerCase().replace(/\s+/g, '-'); // Get the clicked setting

        // Hide all settings bodies
        document.querySelectorAll('.settings-body').forEach(body => {
            body.style.display = 'none'; 
        });

        // Find and show the appropriate settings body
        const targetBody = document.getElementById(`${selectedSetting}`);
        if (targetBody) {
            targetBody.style.display = 'block'; // Show the selected settings content
        } else {
            console.error("Content not found for:", `${selectedSetting}-settings`); // Log error if content is missing
        }

        // Mark active tab in sidebar
        document.querySelectorAll('.settings-sidebar li').forEach(li => li.classList.remove('active')); // Remove active class
        this.classList.add('active'); // Add active class to the clicked item
    });
});

// Event listener for the image file input
document.getElementById('backgroundImageInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            backgroundImage = e.target.result; // Store the image as a base64 URL
            const imagePreview = document.getElementById('imagePreview');
            const removeBackgroundImageButton = document.getElementById('removeBackgroundImageButton');
            const backgroundImageInput = document.querySelector('.custom-upload-button'); 

            // Show the image preview and remove button, hide upload button
            imagePreview.src = backgroundImage; 
            imagePreview.style.display = 'block'; 
            removeBackgroundImageButton.style.display = 'inline-block'; 
            backgroundImageInput.style.display = 'none'; 
        };
        reader.readAsDataURL(file);
    }
});

// Event listener for the remove image button
document.getElementById('removeBackgroundImageButton').addEventListener('click', function() {
    backgroundImage = null; // Clear the background image
    const backgroundImageInput = document.querySelector('.custom-upload-button');
    const fileInput = document.getElementById('backgroundImageInput'); // The actual file input
    document.getElementById('imagePreview').style.display = 'none';
    this.style.display = 'none';

    // Show the "Upload Image" button again
    backgroundImageInput.style.display = 'block';

    // Reset the file input value to allow the same file to be uploaded again
    fileInput.value = '';
});

// Variables to store color values
let deliverableColors = {
    released: "rgb(22, 70, 100)",
    tentative: "#0b0c10",
    committed: "rgba(28, 51, 63, 0.7)"
};
let categoryColor = "#1f2833";
let entryColor = "#45a29e";
let sidebarColor = "rgb(16, 50, 70)";
let globalTextColor = "#45a29e";
let backgroundImage;
let gradientColor1 = '#141e30';
let gradientColor2 = '#324d64';
let modalBackgroundColor = "#1f2833";
let modalContentBackgroundColor = "#0b0c10";
let modalButtonsColor = "#45a29e";
let statusRibbonColor = "#45a29e";
let modalTextColor = "#fff";
let defaultLastReleaseDate = "24/09/2024";
let defaultCurrentLiveVersion = "Beta 0.7";

// Update gradient colors when user selects new colors in the settings
document.getElementById('gradientColor1').addEventListener('input', function() {
    gradientColor1 = this.value; 
});

document.getElementById('gradientColor2').addEventListener('input', function() {
    gradientColor2 = this.value; 
});

// Default gradient on page load
document.addEventListener('DOMContentLoaded', function () {
    document.body.style.backgroundImage = 'linear-gradient(120deg, #141e30, #1c2a3d, #23354a, #2b4157, #324d64, #3a5971)';
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'fixed';
    document.body.style.backgroundPosition = 'center';
});

// Store the selected colors temporarily before applying
let tempDeliverableColors = { ...deliverableColors };
let tempCategoryColor = categoryColor;
let tempEntryColor = entryColor;
let tempSidebarColor = sidebarColor;
let tempGlobalTextColor = globalTextColor;
let tempButtonTextColor = '#fff';
let tempModalBackgroundColor = modalBackgroundColor;
let tempModalContentBackgroundColor = modalContentBackgroundColor;
let tempModalButtonsColor = modalButtonsColor;
let tempStatusRibbonColor = statusRibbonColor;
let tempModalTextColor = modalTextColor;
let tempLastReleaseDate = defaultLastReleaseDate;
let tempCurrentLiveVersion = defaultCurrentLiveVersion;

// Open Color Picker Modal when clicking on any color swatch (deliverable, category, entry, etc.)
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function () {
        const element = this.getAttribute('data-element');
        const status = this.getAttribute('data-status');

        // Open the color picker modal
        const colorPickerModal = document.getElementById('colorPickerModal');
        colorPickerModal.style.display = 'block';

        // Store the clicked element reference in the modal for later use
        colorPickerModal.setAttribute('data-element', element);
        colorPickerModal.setAttribute('data-status', status);
    });
});

// Handle preset color selection for columns, categories, entries, sidebar, and global text
document.querySelectorAll('.preset-color').forEach(preset => {
    preset.addEventListener('click', function () {
        const selectedColor = this.getAttribute('data-color');
        const colorPickerModal = document.getElementById('colorPickerModal');
        const element = colorPickerModal.getAttribute('data-element');
        const status = colorPickerModal.getAttribute('data-status');

        console.log('Selected Color:', selectedColor);
        console.log('Element Type:', element);

        // Check if status is not null before processing deliverable status colors (only columns)
        if (status && status !== 'null') {
            tempDeliverableColors[status] = selectedColor;
            const swatch = document.querySelector(`.color-swatch[data-status="${status}"]`);
            if (swatch) {
                swatch.style.backgroundColor = selectedColor;
                console.log('Deliverable swatch updated:', swatch);
            } else {
                console.log('Deliverable swatch not found for status:', status);
            }
        } 

        // For categories
        else if (element === 'category') {
            tempCategoryColor = selectedColor;
            const categorySwatch = document.querySelector(`.color-swatch[data-element="category"]`);
            if (categorySwatch) {
                categorySwatch.style.backgroundColor = selectedColor;
                console.log('Category swatch updated:', categorySwatch);
            } else {
                console.error('Category swatch not found');
            }
        } 

        // For entries
        else if (element === 'entry') {
            tempEntryColor = selectedColor;
            const entrySwatch = document.querySelector(`.color-swatch[data-element="entry"]`);
            if (entrySwatch) {
                entrySwatch.style.backgroundColor = selectedColor;
                console.log('Entry swatch updated:', entrySwatch);
            } else {
                console.error('Entry swatch not found');
            }
        } 

        // For sidebar
        else if (element === 'sidebar') {
            tempSidebarColor = selectedColor;
            const sidebarSwatch = document.querySelector(`.color-swatch[data-element="sidebar"]`);
            if (sidebarSwatch) {
                sidebarSwatch.style.backgroundColor = selectedColor;
                console.log('Sidebar swatch updated:', sidebarSwatch);
            } else {
                console.error('Sidebar swatch not found');
            }
        } 

        // For global text and buttons
        else if (element === 'global') {
            tempGlobalTextColor = selectedColor;
            const globalSwatch = document.querySelector(`.color-swatch[data-element="global"]`);
            if (globalSwatch) {
                globalSwatch.style.backgroundColor = selectedColor;
                console.log('Global swatch updated:', globalSwatch);
            } else {
                console.error('Global swatch not found');
            }
        }

        else if (element === 'button-text') {
            tempButtonTextColor = selectedColor;
            document.querySelector(`.color-swatch[data-element="button-text"]`).style.backgroundColor = selectedColor;
        }

        // Close the color picker modal after selecting a color
        colorPickerModal.style.display = 'none';
    });
});


// Close Color Picker Modal
document.getElementById('closeColorPicker').addEventListener('click', function () {
    document.getElementById('colorPickerModal').style.display = 'none';
});

// Add event listeners to open color picker for modal settings
document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', function () {
        const element = this.getAttribute('data-element');
        
        // Open the color picker modal
        const colorPickerModal = document.getElementById('colorPickerModal');
        colorPickerModal.style.display = 'block';
        
        // Store the clicked element reference in the modal for later use
        colorPickerModal.setAttribute('data-element', element);
    });
});

// Handle color selection for modals
document.querySelectorAll('.preset-color').forEach(preset => {
    preset.addEventListener('click', function () {
        const selectedColor = this.getAttribute('data-color');
        const colorPickerModal = document.getElementById('colorPickerModal');
        const element = colorPickerModal.getAttribute('data-element');

        if (element === 'modal-background') {
            tempModalBackgroundColor = selectedColor;
            document.querySelector('.color-swatch[data-element="modal-background"]').style.backgroundColor = selectedColor;
        } else if (element === 'modal-content-background') {
            tempModalContentBackgroundColor = selectedColor;
            document.querySelector('.color-swatch[data-element="modal-content-background"]').style.backgroundColor = selectedColor;
        } else if (element === 'modal-buttons') {
            tempModalButtonsColor = selectedColor;
            document.querySelector('.color-swatch[data-element="modal-buttons"]').style.backgroundColor = selectedColor;
        } else if (element === 'status-ribbon') {
            tempStatusRibbonColor = selectedColor;
            document.querySelector('.color-swatch[data-element="status-ribbon"]').style.backgroundColor = selectedColor;
        } else if (element === 'modal-text') {
            tempModalTextColor = selectedColor;
            document.querySelector('.color-swatch[data-element="modal-text"]').style.backgroundColor = selectedColor;
        }

        // Close color picker
        colorPickerModal.style.display = 'none';
    });
});

// Apply all settings
const applyAllButton = document.getElementById('applyAllButton');
if (applyAllButton) {
    applyAllButton.addEventListener('click', function () {
        console.log('Apply All Button Clicked'); // Debugging

        const gradientCheckbox = document.getElementById('applyGradientCheckbox').checked; // Check if the gradient checkbox is checked

        // Check if background image exists and apply it
        if (backgroundImage) {
            document.body.style.backgroundImage = `url(${backgroundImage})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
        } else if (gradientCheckbox) {
            // Apply the gradient if no image is uploaded and the checkbox is checked
            document.body.style.backgroundImage = `linear-gradient(${gradientColor1}, ${gradientColor2})`;
            document.body.style.backgroundSize = 'cover';
            document.body.style.backgroundRepeat = 'no-repeat';
            document.body.style.backgroundAttachment = 'fixed';
            document.body.style.backgroundPosition = 'center';
        } else {
            // If neither image nor gradient checkbox is selected, leave the default gradient
        }

        // Apply deliverable colors (using tempDeliverableColors before applying)
        document.querySelectorAll('.column').forEach(column => {
            const status = column.getAttribute('data-status');
            const colorToApply = tempDeliverableColors[status.toLowerCase()];

            if (colorToApply) {
                column.style.backgroundColor = colorToApply;
            } else {
                console.log('No color found for status:', status); // Log if no color found
            }
        });

        // Apply category color
        document.querySelectorAll('.category').forEach(category => {
            category.style.backgroundColor = tempCategoryColor;
        });

        // Apply entry color
        document.querySelectorAll('.entry').forEach(entry => {
            entry.style.backgroundColor = tempEntryColor;
        });

        // Apply sidebar color
        const sidebar = document.querySelector('.left-sidebar');
        if (sidebar) {
            sidebar.style.backgroundColor = tempSidebarColor;
        }

        // Roadmap-controls button: Affects background color
        document.querySelectorAll('.roadmap-controls button').forEach(button => {
            button.style.backgroundColor = tempGlobalTextColor;
        });

        // Apply global button text color
        document.querySelectorAll('.add-category, .add-entry, .add-column, .roadmap-controls button, .last-updated, h1, h4, p, .editable-column-title, .editable-status').forEach(button => {
            button.style.color = tempButtonTextColor;
        });

        // Add-column button: Affects background color
        document.querySelector('.add-column').style.backgroundColor = tempGlobalTextColor;

        // Add-category buttons: Affects background color
        document.querySelectorAll('.add-category').forEach(button => {
            button.style.backgroundColor = tempGlobalTextColor;
        });

        // Add-entry buttons: Affects background color
        document.querySelectorAll('.add-entry').forEach(button => {
            button.style.backgroundColor = tempGlobalTextColor;
        });

        // Apply the placeholder color logic to all existing inputs
        document.querySelectorAll('.editable-date').forEach(dateInput => {
            // Set input text color and placeholder color
            dateInput.style.setProperty('--placeholder-color', tempButtonTextColor);
            dateInput.style.color = tempButtonTextColor;

            // Force the placeholder to re-render
            const placeholderText = dateInput.placeholder;
            dateInput.placeholder = ''; 
            dateInput.placeholder = placeholderText;
        });

        // Editable-category-title text color
        document.querySelectorAll('.editable-category-title').forEach(input => {
            input.style.color = tempButtonTextColor;
        });

        // Apply modal background color
        document.getElementById('entryModal').style.backgroundColor = tempModalBackgroundColor;
        document.querySelector('.modal-content').style.backgroundColor = tempModalBackgroundColor;

        // Apply modal content background color
        document.querySelector('.modal-sidebar').style.backgroundColor = tempModalContentBackgroundColor;
        document.getElementById('modalTitle').style.backgroundColor = tempModalContentBackgroundColor;
        document.getElementById('modalDescription').style.backgroundColor = tempModalContentBackgroundColor;
        document.querySelectorAll('.checklist').forEach(checklist => {
            checklist.style.backgroundColor = tempModalContentBackgroundColor;
        });

        // Apply modal buttons color
        document.getElementById('addImageButton').style.backgroundColor = tempModalButtonsColor;
        document.getElementById('addChecklistButton').style.backgroundColor = tempModalButtonsColor;
        document.getElementById('modalCategory').style.backgroundColor = tempModalButtonsColor;
        document.querySelectorAll('.add-checklist-item').forEach(button => {
            button.style.backgroundColor = tempModalButtonsColor;
        });
        document.getElementById('saveEntryButton').style.backgroundColor = tempModalButtonsColor;

        // Apply status ribbon color
        document.querySelector('.status-ribbon').style.backgroundColor = tempStatusRibbonColor;

        // Apply modal text color
        document.getElementById('addImageButton').style.color = tempModalTextColor;
        document.getElementById('addChecklistButton').style.color = tempModalTextColor;
        document.getElementById('modalCategory').style.color = tempModalTextColor;
        document.querySelector('.status-ribbon').style.color = tempModalTextColor;
        document.getElementById('modalTitle').style.color = tempModalTextColor;
        document.getElementById('modalDescription').style.color = tempModalTextColor;
        document.getElementById('saveEntryButton').style.color = tempModalTextColor;
        document.querySelectorAll('.checklist-title').forEach(title => {
            title.style.color = tempModalTextColor;
        });
        document.querySelectorAll('.add-checklist-item').forEach(button => {
            button.style.color = tempModalTextColor;
        });
        document.querySelectorAll('.checklist-item-text').forEach(item => {
            item.style.color = tempModalTextColor;
        });

        // Column limit logic:
        const columnLimitToggle = document.getElementById('toggleLimitColumns');
        const columnLimitInput = document.getElementById('columnLimitInput');
        const currentColumnCount = document.querySelectorAll('.column').length;

        if (columnLimitToggle && columnLimitToggle.checked) {
            let columnLimit = parseInt(columnLimitInput.value) || 0;
            if (columnLimit < currentColumnCount) {
                showNotification(`You cannot set a column limit lower than the existing number of columns (${currentColumnCount}). Setting limit to ${currentColumnCount}.`, "warning");
                columnLimit = currentColumnCount; 
                columnLimitInput.value = currentColumnCount; 
            }
            applyColumnLimit(columnLimit);
        }

        // Categories in a Column limit logic
        const categoriesInColumnToggle = document.getElementById('toggleLimitCategoriesInColumn');
        const categoriesInColumnInput = document.getElementById('categoryLimitInColumnInput');
        document.querySelectorAll('.column').forEach(column => {
            const currentCategoryCountInColumn = column.querySelectorAll('.category').length;

            if (categoriesInColumnToggle && categoriesInColumnToggle.checked) {
                let categoryLimitInColumn = parseInt(categoriesInColumnInput.value) || 0;
                if (categoryLimitInColumn < currentCategoryCountInColumn) {
                    showNotification(`You cannot set a category limit per column lower than the existing number of categories (${currentCategoryCountInColumn}). Setting limit to ${currentCategoryCountInColumn}.`, "warning");
                    categoryLimitInColumn = currentCategoryCountInColumn; 
                    categoriesInColumnInput.value = currentCategoryCountInColumn; 
                }
                // Apply the adjusted or valid category limit in this column
                applyCategoryInColumnLimit(categoryLimitInColumn);
            }
        });

        // Global category limit logic
        const globalCategoryLimitToggle = document.getElementById('toggleLimitAllCategories');
        const globalCategoryLimitInput = document.getElementById('allCategoriesLimitInput');
        const currentGlobalCategoryCount = document.querySelectorAll('.category').length;

        if (globalCategoryLimitToggle && globalCategoryLimitToggle.checked) {
            let globalCategoryLimit = parseInt(globalCategoryLimitInput.value) || 0;
            if (globalCategoryLimit < currentGlobalCategoryCount) {
                showNotification(`You cannot set a global category limit lower than the existing number of categories (${currentGlobalCategoryCount}). Setting limit to ${currentGlobalCategoryCount}.`, "warning");
                globalCategoryLimit = currentGlobalCategoryCount; 
                globalCategoryLimitInput.value = currentGlobalCategoryCount;
            }
            applyAllCategoriesLimit(globalCategoryLimit);
        }

        // Entries in a Category limit logic
        const entriesInCategoryToggle = document.getElementById('toggleLimitEntriesInCategory');
        const entriesInCategoryInput = document.getElementById('entriesLimitInCategoryInput');
        document.querySelectorAll('.category').forEach(category => {
            const currentEntryCountInCategory = category.querySelectorAll('.entry').length;

            if (entriesInCategoryToggle && entriesInCategoryToggle.checked) {
                let entryLimitInCategory = parseInt(entriesInCategoryInput.value) || 0;
                if (entryLimitInCategory < currentEntryCountInCategory) {
                    showNotification(`You cannot set an entry limit per category lower than the existing number of entries (${currentEntryCountInCategory}). Setting limit to ${currentEntryCountInCategory}.`, "warning");
                    entryLimitInCategory = currentEntryCountInCategory;
                    entriesInCategoryInput.value = currentEntryCountInCategory;
                }
                // Apply the adjusted or valid entry limit in this category
                applyEntriesInCategoryLimit(entryLimitInCategory);
            }
        });

        // Global entry limit logic
        const globalEntryLimitToggle = document.getElementById('toggleLimitAllEntries');
        const globalEntryLimitInput = document.getElementById('allEntriesLimitInput');
        const currentGlobalEntryCount = document.querySelectorAll('.entry').length;

        if (globalEntryLimitToggle && globalEntryLimitToggle.checked) {
            let globalEntryLimit = parseInt(globalEntryLimitInput.value) || 0;
            if (globalEntryLimit < currentGlobalEntryCount) {
                showNotification(`You cannot set a global entry limit lower than the existing number of entries (${currentGlobalEntryCount}). Setting limit to ${currentGlobalEntryCount}.`, "warning");
                globalEntryLimit = currentGlobalEntryCount;
                globalEntryLimitInput.value = currentGlobalEntryCount; 
            }
            applyAllEntriesLimit(globalEntryLimit);
        }

        // Get the input values for versioning
        const lastReleaseInput = document.getElementById('lastReleaseDate').value;
        const liveVersionInput = document.getElementById('liveVersionInput').value;
    
        // Format the Last Release Date from yyyy-mm-dd to dd/mm/yyyy
        let formattedLastRelease = formatDateToDDMMYYYY(lastReleaseInput);
    
        // If no input, use the default values
        if (!formattedLastRelease) {
            formattedLastRelease = defaultLastReleaseDate;
        }
    
        if (!liveVersionInput) {
            document.querySelector('.info-live-version').innerHTML = `Current Live Version: ${defaultCurrentLiveVersion}`;
        } else {
            document.querySelector('.info-live-version').innerHTML = `Current Live Version: ${liveVersionInput}`;
        }
    
        // Update the Last Release section
        document.querySelector('.info-last-release').innerHTML = `Last Release: ${formattedLastRelease}`;

        // Close the settings modal after applying
        const settingsModal = document.getElementById('settingsmodal');
        if (settingsModal) settingsModal.style.display = 'none'; 

        saveToLocalStorage();
    });
}

// Reset all settings
const resetButton = document.getElementById('resetButton');
if (resetButton) {
    resetButton.addEventListener('click', function () {
        // Reset to default values for Dashboard Settings
        deliverableColors = {
            released: "rgb(22, 70, 100)",
            tentative: "#0b0c10",
            committed: "rgba(28, 51, 63, 0.7)"
        };
        categoryColor = "#1f2833";
        entryColor = "#45a29e";
        sidebarColor = "rgb(16, 50, 70)";
        globalTextColor = "#45a29e";
        tempButtonTextColor = '#fff'; 

        // Reset temporary variables for Dashboard Settings
        tempDeliverableColors = { ...deliverableColors };
        tempCategoryColor = categoryColor;
        tempEntryColor = entryColor;
        tempSidebarColor = sidebarColor;
        tempGlobalTextColor = globalTextColor;

        // Reset to default values for Modal Settings
        modalBackgroundColor = "#1f2833";
        modalContentBackgroundColor = "#0b0c10";
        modalButtonsColor = "#45a29e";
        statusRibbonColor = "#45a29e";
        modalTextColor = "#fff";

        // Reset temporary variables for Modal Settings
        tempModalBackgroundColor = modalBackgroundColor;
        tempModalContentBackgroundColor = modalContentBackgroundColor;
        tempModalButtonsColor = modalButtonsColor;
        tempStatusRibbonColor = statusRibbonColor;
        tempModalTextColor = modalTextColor;

        // Column limit elements
        const columnToggle = document.getElementById('toggleLimitColumns');
        const columnInput = document.getElementById('columnLimitInput');
        
        // Categories in column limit elements
        const categoriesInColumnToggle = document.getElementById('toggleLimitCategoriesInColumn');
        const categoriesInColumnInput = document.getElementById('categoryLimitInColumnInput');
        
        // All categories limit elements
        const allCategoriesToggle = document.getElementById('toggleLimitAllCategories');
        const allCategoriesInput = document.getElementById('allCategoriesLimitInput');
        
        // Entries in category limit elements
        const entriesInCategoryToggle = document.getElementById('toggleLimitEntriesInCategory');
        const entriesInCategoryInput = document.getElementById('entriesLimitInCategoryInput');
        
        // All entries limit elements
        const allEntriesToggle = document.getElementById('toggleLimitAllEntries');
        const allEntriesInput = document.getElementById('allEntriesLimitInput');
        
        // Reset and disable limits
        function resetLimit(toggleElement, inputElement) {
            toggleElement.checked = false;  
            inputElement.disabled = true;   
            inputElement.value = '';        
        }

        // Reset each limit
        resetLimit(columnToggle, columnInput);
        resetLimit(categoriesInColumnToggle, categoriesInColumnInput);
        resetLimit(allCategoriesToggle, allCategoriesInput);
        resetLimit(entriesInCategoryToggle, entriesInCategoryInput);
        resetLimit(allEntriesToggle, allEntriesInput);

        // Reset the UI elements back to default colors
        updateUI();

        // Apply the reset default colors to the UI
        applyAllButton.click(); 
        showNotification("All settings reset to default.", "success");

        // Reset versioning inputs to default values
        document.getElementById('lastReleaseDate').value = ""; 
        document.getElementById('liveVersionInput').value = "";

        // Reset displayed values to default
        document.querySelector('.info-last-release').innerHTML = `Last Release: ${defaultLastReleaseDate}`;
        document.querySelector('.info-live-version').innerHTML = `Current Live Version: ${defaultCurrentLiveVersion}`;

        //Set gradient to default
        document.body.style.backgroundImage = 'linear-gradient(120deg, #141e30, #1c2a3d, #23354a, #2b4157, #324d64, #3a5971)';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundAttachment = 'fixed';
        document.body.style.backgroundPosition = 'center';

        saveToLocalStorage();
    });
}

// Update UI function
function updateUI() {
    const releasedSwatch = document.querySelector('.color-swatch[data-status="released"]');
    if (releasedSwatch) releasedSwatch.style.backgroundColor = tempDeliverableColors.released;

    const tentativeSwatch = document.querySelector('.color-swatch[data-status="tentative"]');
    if (tentativeSwatch) tentativeSwatch.style.backgroundColor = tempDeliverableColors.tentative;

    const committedSwatch = document.querySelector('.color-swatch[data-status="committed"]');
    if (committedSwatch) committedSwatch.style.backgroundColor = tempDeliverableColors.committed;

    const categorySwatch = document.querySelector('.color-swatch[data-element="category"]');
    if (categorySwatch) categorySwatch.style.backgroundColor = tempCategoryColor;

    const entrySwatch = document.querySelector('.color-swatch[data-element="entry"]');
    if (entrySwatch) entrySwatch.style.backgroundColor = tempEntryColor;

    const sidebarSwatch = document.querySelector('.color-swatch[data-element="sidebar"]');
    if (sidebarSwatch) sidebarSwatch.style.backgroundColor = tempSidebarColor;

    const globalSwatch = document.querySelector('.color-swatch[data-element="global"]');
    if (globalSwatch) globalSwatch.style.backgroundColor = tempGlobalTextColor;

    const buttonTextSwatch = document.querySelector('.color-swatch[data-element="button-text"]');
    if (buttonTextSwatch) buttonTextSwatch.style.backgroundColor = tempButtonTextColor;

    // Update modals settings swatches
    const modalBackgroundSwatch = document.querySelector('.color-swatch[data-element="modal-background"]');
    if (!modalBackgroundSwatch) {
        console.error("Modal Background Swatch not found!");
    } else {
        console.log("Modal Background Swatch found:", modalBackgroundSwatch);
    }
    if (modalBackgroundSwatch) modalBackgroundSwatch.style.backgroundColor = tempModalBackgroundColor;

    const modalContentBackgroundSwatch = document.querySelector('.color-swatch[data-element="modal-content-background"]');
    if (modalContentBackgroundSwatch) modalContentBackgroundSwatch.style.backgroundColor = tempModalContentBackgroundColor;

    const modalButtonsSwatch = document.querySelector('.color-swatch[data-element="modal-buttons"]');
    if (modalButtonsSwatch) modalButtonsSwatch.style.backgroundColor = tempModalButtonsColor;

    const statusRibbonSwatch = document.querySelector('.color-swatch[data-element="status-ribbon"]');
    if (statusRibbonSwatch) statusRibbonSwatch.style.backgroundColor = tempStatusRibbonColor;

    const modalTextSwatch = document.querySelector('.color-swatch[data-element="modal-text"]');
    if (modalTextSwatch) modalTextSwatch.style.backgroundColor = tempModalTextColor;

    // Disable Background Gradient Checkbox on popup open
    document.getElementById('applyGradientCheckbox').checked = false;
}

// Update UI to refresh the color swatches on modal open
updateUI();

/////////////////////////////////// LIMITS SECTION START ////////////////////////////////

// Limits Section
document.addEventListener('DOMContentLoaded', function () {
    function handleToggleAndLimits(toggleElement, inputElement, currentCount, entityName) {
        toggleElement.addEventListener('change', function () {
            if (this.checked) {
                inputElement.disabled = false;
                inputElement.value = currentCount;
                inputElement.addEventListener('input', function () {
                    if (parseInt(inputElement.value) < currentCount) {
                        showNotification(`Can't limit number to less than existing ${entityName} (${currentCount})`, "warning");
                        inputElement.value = currentCount; 
                    }
                });
            } else {
                inputElement.disabled = true;
                inputElement.value = '';
            }
        });
    }

    // Column limit logic
    const columnToggle = document.getElementById('toggleLimitColumns');
    const columnInput = document.getElementById('columnLimitInput');
    const currentColumnCount = document.querySelectorAll('.column').length;
    handleToggleAndLimits(columnToggle, columnInput, currentColumnCount, 'columns');

    // Categories in Column limit logic
    const categoriesInColumnToggle = document.getElementById('toggleLimitCategoriesInColumn');
    const categoriesInColumnInput = document.getElementById('categoryLimitInColumnInput');
    const currentCategoryCountInColumn = document.querySelectorAll('.category').length;
    handleToggleAndLimits(categoriesInColumnToggle, categoriesInColumnInput, currentCategoryCountInColumn, 'categories per column');

    // All Categories limit logic
    const allCategoriesToggle = document.getElementById('toggleLimitAllCategories');
    const allCategoriesInput = document.getElementById('allCategoriesLimitInput');
    const currentAllCategoryCount = document.querySelectorAll('.category').length;
    handleToggleAndLimits(allCategoriesToggle, allCategoriesInput, currentAllCategoryCount, 'all categories');

    // Entries in Category limit logic
    const entriesInCategoryToggle = document.getElementById('toggleLimitEntriesInCategory');
    const entriesInCategoryInput = document.getElementById('entriesLimitInCategoryInput');
    const currentEntryCountInCategory = document.querySelectorAll('.entry').length;
    handleToggleAndLimits(entriesInCategoryToggle, entriesInCategoryInput, currentEntryCountInCategory, 'entries per category');

    // All Entries limit logic
    const allEntriesToggle = document.getElementById('toggleLimitAllEntries');
    const allEntriesInput = document.getElementById('allEntriesLimitInput');
    const currentAllEntryCount = document.querySelectorAll('.entry').length;
    handleToggleAndLimits(allEntriesToggle, allEntriesInput, currentAllEntryCount, 'all entries');
});

function applyColumnLimit(limit) {
    const currentColumns = document.querySelectorAll('.column').length;
    if (currentColumns > limit) {
        showNotification(`Too many columns! The limit is ${limit}, but you have ${currentColumns} columns.`, "warning");
    }
}

function applyCategoryInColumnLimit(limit) {
    document.querySelectorAll('.column').forEach(column => {
        const currentCategories = column.querySelectorAll('.category').length;
        if (currentCategories > limit) {
            showNotification(`Too many categories in column! The limit is ${limit}, but you have ${currentCategories} categories in this column.`, "warning");
        }
    });
}

function applyAllCategoriesLimit(limit) {
    const currentCategories = document.querySelectorAll('.category').length;
    if (currentCategories > limit) {
        showNotification(`Too many categories! The limit is ${limit}, but you have ${currentCategories} categories.`, "warning");
    }
}

function applyEntriesInCategoryLimit(limit) {
    document.querySelectorAll('.category').forEach(category => {
        const currentEntries = category.querySelectorAll('.entry').length;
        if (currentEntries > limit) {
            showNotification(`Too many entries in category! The limit is ${limit}, but you have ${currentEntries} entries in this category.`, "warning");
        }
    });
}

function applyAllEntriesLimit(limit) {
    const currentEntries = document.querySelectorAll('.entry').length;
    if (currentEntries > limit) {
        showNotification(`Too many entries! The limit is ${limit}, but you have ${currentEntries} entries.`, "warning");
    }
}

/* EXPERIMENTAL --- NOT FULLY IMPLEMENTED ---
///////////////////////////////// SAVE AND LOAD FROM LOCAL STORAGE FUNCTIONALITY START ////////////////////////////////////

// SAVE
function saveToLocalStorage() {
    const columns = [];

    document.querySelectorAll('.column').forEach(column => {
        const columnData = {
            title: column.querySelector('.editable-column-title').value,
            status: column.querySelector('.editable-status').value,
            date: column.querySelector('.editable-date').value,
            categories: [],
        };

        column.querySelectorAll('.category').forEach(category => {
            const categoryData = {
                title: category.querySelector('.editable-category-title').value,
                entries: [],
            };

            category.querySelectorAll('.entry').forEach(entry => {
                const entryData = {
                    title: entry.querySelector('h4').textContent,
                    description: entry.querySelector('p').textContent,
                    image: entry.dataset.image || null,
                    checklists: entry.dataset.checklists || null,
                };

                categoryData.entries.push(entryData);
            });

            columnData.categories.push(categoryData);
        });

        columns.push(columnData);
    });

    // Save columns, categories, and entries
    localStorage.setItem('roadmapColumns', JSON.stringify(columns));

    // Save additional settings (limits, colors, etc.)
    const settings = {
        lastReleaseDate: document.getElementById('lastReleaseDate').value || defaultLastReleaseDate,
        liveVersion: document.getElementById('liveVersionInput').value || defaultCurrentLiveVersion,
        columnLimit: document.getElementById('columnLimitInput').value || 0,
        categoryLimit: document.getElementById('categoryLimitInColumnInput').value || 0,
        globalCategoryLimit: document.getElementById('allCategoriesLimitInput').value || 0,
        entryLimit: document.getElementById('entriesLimitInCategoryInput').value || 0,
        globalEntryLimit: document.getElementById('allEntriesLimitInput').value || 0,
        deliverableColors: tempDeliverableColors,
        categoryColor: tempCategoryColor,
        entryColor: tempEntryColor,
        sidebarColor: tempSidebarColor,
        buttonTextColor: tempButtonTextColor,
        modalBackgroundColor: tempModalBackgroundColor,
        modalButtonsColor: tempModalButtonsColor,
        modalTextColor: tempModalTextColor,
        gradientColor1: gradientColor1,
        gradientColor2: gradientColor2,
        ribbonColor: tempStatusRibbonColor, // Save the ribbon color
        lastUpdatedText: document.querySelector('.last-updated').textContent,
        limitToggles: {
            columnLimit: document.getElementById('toggleLimitColumns').checked,
            categoryLimit: document.getElementById('toggleLimitCategoriesInColumn').checked,
            globalCategoryLimit: document.getElementById('toggleLimitAllCategories').checked,
            entryLimit: document.getElementById('toggleLimitEntriesInCategory').checked,
            globalEntryLimit: document.getElementById('toggleLimitAllEntries').checked,
        }
    };

    localStorage.setItem('roadmapSettings', JSON.stringify(settings));
}

// LOAD FROM LOCAL STORAGE
function loadFromLocalStorage() {
    const savedColumns = localStorage.getItem('roadmapColumns');
    const savedSettings = localStorage.getItem('roadmapSettings');

    // Clear current roadmap content
    const roadmapContainer = document.querySelector('.roadmap');
    roadmapContainer.innerHTML = '';

    // Function to handle drag-and-drop functionality for columns
    function reinitializeDragAndDrop() {
        const columns = document.querySelectorAll('.column');
        columns.forEach(column => {
            column.setAttribute('draggable', 'true');
            column.addEventListener('dragstart', handleDragStart);
            column.addEventListener('dragover', handleDragOver);
            column.addEventListener('drop', handleDrop);
        });
    }

    // Function to reapply all listeners after loading
    function applyListenersToColumn(column) {
        // Reapply column listeners
        const deleteColumnBtn = column.querySelector('.delete-column');
        deleteColumnBtn.addEventListener('click', function () {
            showConfirmationPopup("Are you sure you want to delete this column?", column);
        });

        const addCategoryButton = column.querySelector('.add-category');
        addCategoryButton.addEventListener('click', function () {
            const newCategory = createCategoryElement();
            column.querySelector('.categories').insertBefore(newCategory, addCategoryButton);
            saveToLocalStorage();
        });

        const toggleColumnBtn = column.querySelector('.toggle-column');
        applyColumnCollapse(toggleColumnBtn);

        // Reapply status change event
        const statusSelect = column.querySelector('.editable-status');
        statusSelect.addEventListener('change', function () {
            const selectedStatus = statusSelect.value;
            column.setAttribute('data-status', selectedStatus);
            updateColumnColors(column, selectedStatus);
            saveToLocalStorage();
        });

        // Reapply drag and drop functionality
        column.addEventListener('dragstart', handleDragStart);
        column.addEventListener('dragover', handleDragOver);
        column.addEventListener('drop', handleDrop);
    }

    // If columns were saved, load them
    if (savedColumns) {
        const columnsData = JSON.parse(savedColumns);

        // Loop through saved columns
        columnsData.forEach(columnData => {
            const newColumn = document.createElement('div');
            newColumn.classList.add('column');
            newColumn.setAttribute('draggable', 'true');
            newColumn.setAttribute('data-status', columnData.status);

            newColumn.innerHTML = `
                <div class="column-header">
                    <input type="text" class="editable-column-title" placeholder="Column Name" value="${columnData.title}" />
                    <div class="column-controls">
                        <button class="toggle-column">-</button>
                        <button class="delete-column">🗑️</button>
                        <select class="editable-status">
                            <option value="TENTATIVE" ${columnData.status === 'TENTATIVE' ? 'selected' : ''}>TENTATIVE</option>
                            <option value="RELEASED" ${columnData.status === 'RELEASED' ? 'selected' : ''}>RELEASED</option>
                            <option value="COMMITTED" ${columnData.status === 'COMMITTED' ? 'selected' : ''}>COMMITTED</option>
                        </select>
                        <div class="quarter-picker">
                            <input type="text" class="editable-date" value="${columnData.date}" readonly />
                            <input type="date" class="hidden-date-picker" />
                            <input type="text" class="calendaricon" placeholder="📅" readonly />
                        </div>
                    </div>
                </div>
                <div class="categories">
                    <button class="add-category">+ Add Category</button>
                </div>`;

            // Loop through saved categories
            columnData.categories.forEach(categoryData => {
                const newCategory = document.createElement('div');
                newCategory.classList.add('category');

                newCategory.innerHTML = `
                    <div class="category-header">
                        <input type="text" class="editable-category-title" placeholder="Category Name" value="${categoryData.title}" />
                        <button class="delete-category">🗑️</button>
                        <span class="entry-count">${categoryData.entries.length} Entries</span>
                        <button class="toggle-category">▼</button>
                    </div>
                    <div class="entries">
                        <button class="add-entry">+ Add Entry</button>
                    </div>`;

                // Loop through saved entries in each category
                categoryData.entries.forEach(entryData => {
                    const newEntry = document.createElement('div');
                    newEntry.classList.add('entry');

                    newEntry.innerHTML = `
                        <div class="entry-header">
                            <h4>${entryData.title}</h4>
                            <button class="delete-entry">🗑️</button>
                        </div>
                        <p>${entryData.description}</p>`;

                    // Add image if present
                    if (entryData.image) {
                        newEntry.dataset.image = entryData.image;
                        const imgElement = document.createElement('img');
                        imgElement.src = entryData.image;
                        newEntry.insertBefore(imgElement, newEntry.querySelector('p'));
                    }

                    newCategory.querySelector('.entries').insertBefore(newEntry, newCategory.querySelector('.add-entry'));
                });

                newColumn.querySelector('.categories').appendChild(newCategory);

                // Attach listeners to category
                applyCategoryListeners(newCategory);
            });

            roadmapContainer.appendChild(newColumn);

            // Attach listeners to column
            applyListenersToColumn(newColumn);
        });

        // Reinitialize drag-and-drop functionality after loading columns
        reinitializeDragAndDrop();
    }

    // Restore settings if they exist
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);

        // Restore versioning and limits
        document.getElementById('lastReleaseDate').value = settings.lastReleaseDate || defaultLastReleaseDate;
        document.getElementById('liveVersionInput').value = settings.liveVersion || defaultCurrentLiveVersion;
        document.getElementById('columnLimitInput').value = settings.columnLimit || 0;
        document.getElementById('categoryLimitInColumnInput').value = settings.categoryLimit || 0;
        document.getElementById('allCategoriesLimitInput').value = settings.globalCategoryLimit || 0;
        document.getElementById('entriesLimitInCategoryInput').value = settings.entryLimit || 0;
        document.getElementById('allEntriesLimitInput').value = settings.globalEntryLimit || 0;

        // Apply colors and text settings
        tempDeliverableColors = settings.deliverableColors || tempDeliverableColors;
        tempCategoryColor = settings.categoryColor || tempCategoryColor;
        tempEntryColor = settings.entryColor || tempEntryColor;
        tempSidebarColor = settings.sidebarColor || tempSidebarColor;
        tempButtonTextColor = settings.buttonTextColor || tempButtonTextColor;
        tempModalBackgroundColor = settings.modalBackgroundColor || tempModalBackgroundColor;
        tempModalButtonsColor = settings.modalButtonsColor || tempModalButtonsColor;
        tempModalTextColor = settings.modalTextColor || tempModalTextColor;

        applyAllButton.click(); // Apply restored settings
    }
}

// Apply necessary listeners to categories after loading
function applyCategoryListeners(category) {
    const addEntryButton = category.querySelector('.add-entry');
    addEntryButton.addEventListener('click', function () {
        const newEntry = createEntryElement();
        category.querySelector('.entries').insertBefore(newEntry, addEntryButton);
        saveToLocalStorage();
    });

    const deleteCategoryBtn = category.querySelector('.delete-category');
    deleteCategoryBtn.addEventListener('click', function () {
        showConfirmationPopup("Are you sure you want to delete this category?", category);
    });

    const toggleCategoryBtn = category.querySelector('.toggle-category');
    applyCategoryCollapse(toggleCategoryBtn);
}



// Status change dynamic color update function
function updateColumnColors(column, status) {
    if (status === 'RELEASED') {
        column.style.backgroundColor = tempDeliverableColors.released;
    } else if (status === 'COMMITTED') {
        column.style.backgroundColor = tempDeliverableColors.committed;
    } else {
        column.style.backgroundColor = tempDeliverableColors.tentative;
    }
}


// LOAD ON PAGE LOAD
document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();  // Call the function to load everything from local storage when the page loads
});
*/

