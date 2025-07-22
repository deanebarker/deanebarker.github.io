(function () {
  "use strict";

  const SOCIAL_ACTIONS_QUERY = ".news-feed-post-social-actions";
  const BUTTON_NAME = "Repost";
  const BASE_TINY_MCE_URL =
    "https://deanebarker.github.io/tinymce/";

  function addScript() {
    document.addScriptLink(BASE_TINY_MCE_URL + "tinymce.min.js");
  }

  function addStyles() {
    document.appendStyle(`
            .repost { border: none; }
            .channel { margin-bottom: 0.5em; display: flex; gap: 1em; }
            .channel:last-of-type { margin-bottom: 2em; }
            dialog#repostDialog { position: static; width: 500px; height: 80%; border: none; padding: 3rem; z-index: 1301; }
            dialog#repostDialog h3 { font-size: 19px;  text-align: center; line-height: 140%; }
            dialog#repostDialog .input-group { margin-bottom: 1.5em; max-width: 100% !important; }
            dialog#repostDialog button { width: 47%; display: inline-block; }
            .danger label { text-decoration: line-through; color: rgb(150,150,150);}
            .warning label { background-color: rgb(255,200,200); }
        `);
  }

  function findSocialActions() {
    // First, let's handle anything might already be on the page
    document.querySelectorAll(SOCIAL_ACTIONS_QUERY).forEach((el) => {
      addRepostButton(el);
    });
  }

  function initObserver() {
    // Then, let's set up a MutationObserver to watch for new posts being added to the page
    const config = {
      childList: true,
      subtree: true,
      attributes: false,
    };

    const detectSocialPosts = (mutationsList, observer) => {
      let newSocialNodes = mutationsList
        .flatMap((mutation) => Array.from(mutation.addedNodes))
        .filter(
          (node) =>
            node.querySelector && node.querySelector(SOCIAL_ACTIONS_QUERY)
        );

      newSocialNodes.forEach((element) => {
        element.querySelectorAll(SOCIAL_ACTIONS_QUERY).forEach((el) => {
          addRepostButton(el);
        });
      });
    };

    const observer = new MutationObserver(detectSocialPosts);
    observer.observe(document.body, config);
  }

  function addRepostButton(element) {
    let button = document.createElement("button");
    button.setAttribute(
      "data-post-id",
      element.closest("article").getAttribute("data-post-id")
    );
    button.setAttribute("style", "order: 3; width: auto; margin: 0;");
    button.classList.add("social-button", "light", "no-styles");
    button.appendHTML(`
            <span aria-hidden="true" class="we-icon css-1ccn5tk-IconStyled e19il6tt0">u</span>
            <span>${BUTTON_NAME}</span>
        `);

    // I hate that this is some kind of "magic class"...
    button.classList.add(
      "css-1qdcl7-SocialButtonWithSvgIcon-baseSocialButtonStyles"
    );

    button.addEventListener("click", openDialog);

    element.appendChild(button);
  }

  async function openDialog(e) {
    let inner = document.createExtendedElement(
      "dialog",
      "repostDialog",
      "wide editor-dialog ",
      null
    );
    document.body.appendChild(inner);

    // Inner
    //var inner = document.createExtendedElement('div', null, 'dialog-inner clean', null);

    // Dialog title
    inner.appendHTML(`
            <h3>Repost</h3>
        `);

    // Title field
    inner.appendHTML(`
            <div class="input-group editor-field editor-field-title with-headline">
                <label class="editor-field-headline" for="repostField-title">Title<span aria-hidden="true">*</span></label>
                <input class="editor-field-input" placeholder="Enter a title..." tabindex="0" id="repostField-title" required="">
            </div>
        `);

    // Text field
    inner.appendHTML(`
            <div class="input-group editor-field editor-field-title with-headline">
                <label class="editor-field-headline" for="repostField-content">Content</label>
                <textarea id="repostField-content"></textarea>
            </div>
        `);

    // Channels
    let channels = await repostDataManager.getAvailableChannels();
    channels.forEach((c) => {
      inner.appendHTML(`
            <div class="channel" id="channel-container-${c.id}">
                <input class="repostField-channel" id="channel-${c.id}" type="checkbox" value="${c.id}">
                <label for="channel-${c.id}">${c.name}</label>
            </div>
        `);
    });

    // Repost ID
    inner.appendHTML(`
            <input type="hidden" id="repostField-repostId" value="${e.target
              .closest("button")
              .getAttribute("data-post-id")}">
        `);

    // Cancel button
    inner.appendHTML(`
            <button id="cancelButton" class="cancel-button neutral light" tabindex="0">Cancel</button>
        `);

    // Submit button
    inner.appendHTML(`
            <button id="repostButton" class="ok-button">Repost</button>
        `);

    document.getElementById("repostButton").addEventListener("click", repost);
    document.getElementById("cancelButton").addEventListener("click", () => {
      inner.close();
    });

    let config = {
      selector: "#repostField-content",
      plugins: "lists link",
      toolbar: `bold italic | link unlink | bullist numlist | outdent indent | removeformat`,
      height: 500,
      menubar: false,
      branding: false,
      license_key: "gpl",
      base_url: BASE_TINY_MCE_URL,
      link_context_toolbar: true,
      minify: true,
      suffix: '.min',
      setup: function (editor) {
        console.log("Repost: TinyMCE editor setup", editor);
        editor.on('blur', function () {
          console.log("Repost: Saving TinyMCE content on blur");
          console.log(editor.save()); // Writes back to the original <textarea>
          console.log(editor.getContent()); // Get the content
          console.log(document.getElementById("repostField-content").value);
        })
      },


      // This is the explicitly control where TinyMCE loads its plugins from
      // external_plugins: {
      //   link: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.9.1/plugins/link/plugin.min.js',
      //   lists: 'https://cdnjs.cloudflare.com/ajax/libs/tinymce/7.6.1/plugins/lists/plugin.js'
      // }
  

      // This is a hack to fix a weird bug that puts TinyMCE's dialogs underneath the DIALOG element that spawned it
      init_instance_callback: function (editor) {
        const dialogContainer = editor.editorContainer.closest("dialog");
        if (dialogContainer) {
          const auxElements = document.querySelectorAll(
            "body > .tox-tinymce-aux"
          );
          if (auxElements.length)
            dialogContainer.append(auxElements[auxElements.length - 1]);
        }
      },
    };
    console.log("Repost: TinyMCE config", config);
    tinymce.remove(config.selector);
    tinymce.init(config);

    inner.addEventListener("close", () => {
      inner.remove(); // Remove the dialog from the DOM
    });

    inner.showModal();

    // Now we'll test for permissions
    // var thisPost = await repostDataManager.getPost(
    //   e.target.closest("button").getAttribute("data-post-id")
    // );
    // var thisChannelAccessors =
    //   (await repostDataManager
    //     .getChannel(thisPost.channelID)
    //     .accessors?.groups?.data?.map((g) => g.id)) ?? [];

    // console.log("Repost: This post's accessors", thisChannelAccessors);

    // for (const channel of channels) {
    //   var channelData = await repostDataManager.getChannel(channel.id);

    //   if (channelData?.accessors?.groups?.data) {
    //     // Do we even have accessors?
    //     var channelContainer = document.getElementById(
    //       "channel-container-" + channel.id
    //     );

    //     var accessors = channelData.accessors.groups.data.map((g) => g.id);
    //     console.log("Repost: Channel accessors", accessors);
    //     if (!accessors.some((i) => thisChannelAccessors.includes(i))) {
    //       // This channel has defined accessors, and none of them include any of this channel's accessors
    //       channelContainer.classList.add("danger");
    //     }

    //     if (accessors.length > thisChannelAccessors.length) {
    //       // This channel has more accessors than the original channel
    //       channelContainer.classList.add("warning");
    //     }
    //   }
    // }
  }

  async function repost(e) {
    let dialog = e.target.closest("dialog");

    let postTo = [];
    dialog.querySelectorAll("input.repostField-channel").forEach((c) => {
      if (c.checked) {
        postTo.push(c.getAttribute("value"));
      }
    });

    var newPost = {
      contents: {
        en_US: {
          title: document.getElementById("repostField-title").value,
          content: document.getElementById("repostField-content").value,
        },
      },
      published: true,
      repostId: document.getElementById("repostField-repostId").value,
    };

    postTo.forEach(async (c) => {
      await repostDataManager.postToChannel(c, newPost);
    });

    // Remove the dialog, so we're not left with a bunch of them
    dialog.parentNode.removeChild(dialog);

    // Destroy the TinyMCE instance
    tinymce.remove();
  }

  async function fetchJson(url) {
    try {
      console.log("Fetching JSON from:", url);

      const response = await fetch(url);

      // Check if the response status is OK (status code 200-299)
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Parse and return the JSON data
      const jsonData = await response.json();

      //console.log('Fetched JSON data:', jsonData);

      return jsonData;
    } catch (error) {
      // Handle errors (e.g., network issues, invalid JSON, etc.)
      console.error("Failed to fetch JSON:", error);
      throw error;
    }
  }

  // Rolls up methods to communicate with the instance
  var repostDataManager = {
    getPost: async (id) => {
      return await fetchJson("/api/posts/" + id);
    },

    getChannel: async (id) => {
      return await fetchJson("/api/channels/" + id);
    },

    getAvailableChannels: async () => {
      let channels = await fetchJson("/api/channels");
      return channels.data
        .filter((c) => c.rights.includes("CONTRIBUTE"))
        .map((c) => {
          return { id: c.id, name: c.config.localization.en_US.title };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    getSystemData: async () => {
      let data = await fetchJson("/auth/discover");
      return { userId: data.user.id, csrfToken: data.csrfToken };
    },

    getUserGroups: async (id) => {
      let groups = await fetchJson("/api/users/" + id + "/groups");
      return groups.data.map((g) => {
        return g.name;
      });
    },

    postToChannel: async (channelId, post) => {
      let sysData = await repostDataManager.getSystemData();

      return new Promise((resolve, reject) => {
        fetch("/api/channels/" + channelId + "/posts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": sysData.csrfToken,
          },
          body: JSON.stringify(post),
        }).then((response) => {
          if (response.ok) {
            resolve(response.json());
          } else {
            reject(new Error("Failed to post to channel"));
          }
        });
      });
    },
  };

  function checkAccess() {
    const requiredUserGroup = "CanRepost";

    // Does this user have permission to repost?
    repostDataManager.getSystemData().then(async (sysData) => {
      repostDataManager.getUserGroups(sysData.userId).then(async (groups) => {
        if (!groups.includes(requiredUserGroup)) {
          console.log(
            "Repost: User does not have permission to repost, aborting."
          );
          return;
        } else {
          console.log("Repost: User has permission to repost, continuing.");
          addScript();
          addStyles();
          findSocialActions();
          initObserver();
        }
      });
    });
  }

  // Prototype helpers --
  // I'll roll these off to a separate file later, but for now, this is fine

  // Add HTML to an element
  HTMLElement.prototype.appendHTML = function (html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    while (div.firstChild) {
      this.appendChild(div.firstChild);
    }
  };

  // Creates an element with ID, classes, and content
  Document.prototype.createExtendedElement = function (
    tagName,
    id,
    classes,
    content
  ) {
    // Create the element
    let element = document.createElement(tagName);

    // Set the ID if it exists
    if (id) {
      element.id = id;
    }

    // Set the classes if they exist
    if (classes) {
      element.className = classes;
    }

    // Set the content
    element.innerHTML = content;

    return element;
  };

  // Add a script link to the document
  Document.prototype.addScriptLink = function (src) {
    let scriptTag = document.createElement("script");
    scriptTag.src = src;
    scriptTag.type = "text/javascript";
    document.body.appendChild(scriptTag);
  };

  // Appends CSS to the document head
  Document.prototype.appendStyle = function (css) {
    let styleTag = document.createElement("style");
    styleTag.textContent = css;
    this.head.appendChild(styleTag);
  };

  // Add global style
  // This needs to be appear whether the user can repost or not
  document.appendStyle(`
        article:has(div.repost-preview.not-available) { display: none; }
    `);

  // This starts it all...
  checkAccess();
})();

/*

General flow:

1. checkAccess() checks if the user has permission to repost
2. findSocialActions() calls addRepostButton() to any existing posts on the page
3. initObserver() sets up a MutationObserver to watch for new posts being added to the page and calls addRepostButton() on them
4. addRepostButton() creates a new button and adds it to an individual post; when clicked, this button calls openDialog()
5. openDialog() creates a dialog with a title and content field, and a list of channels to post to
6. report() is called when the user clicks the "Repost" button; it collects the data from the dialog and calls repostDataManager.postToChannel() to post to the selected channels

*/
