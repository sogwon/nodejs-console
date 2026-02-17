(function () {
  const API = "/api/entries";
  const entryList = document.getElementById("entryList");
  const listFooter = document.getElementById("listFooter");
  const listLoading = document.getElementById("listLoading");
  const formSection = document.getElementById("formSection");
  const formTitleEl = document.getElementById("formTitle");
  const detailSection = document.getElementById("detailSection");
  const entryForm = document.getElementById("entryForm");
  const entryId = document.getElementById("entryId");
  const logDate = document.getElementById("logDate");
  const titleInput = document.getElementById("title");
  const contentEditorEl = document.getElementById("content-editor");
  const filterDate = document.getElementById("filterDate");
  const entryDetail = document.getElementById("entryDetail");
  const detailMeta = document.getElementById("detailMeta");
  const modal = document.getElementById("modal");
  const modalMessage = document.getElementById("modalMessage");
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");
  const btnSubmit = document.getElementById("btnSubmit");

  let deleteTargetId = null;
  let currentEntry = null;
  let quillEditor = null;

  function getQuill() {
    if (!quillEditor && contentEditorEl) {
      quillEditor = new Quill(contentEditorEl, {
        theme: "snow",
        placeholder: "업무 내용을 입력하세요",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
            [{ color: [] }, { background: [] }],
            ["blockquote", "code-block"],
            ["clean"],
          ],
        },
      });
    }
    return quillEditor;
  }

  function setEditorContent(htmlOrText) {
    const q = getQuill();
    if (!q) return;
    if (!htmlOrText || (typeof htmlOrText !== "string")) {
      q.setText("");
      return;
    }
    const trimmed = htmlOrText.trim();
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      q.clipboard.dangerouslyPasteHTML(trimmed, "api");
      q.setSelection(0, "silent");
    } else {
      q.setText(trimmed);
    }
  }

  function getEditorContent() {
    const q = getQuill();
    if (!q) return "";
    const html = q.root.innerHTML.trim();
    return html === "<p><br></p>" ? "" : html;
  }

  function stripHtmlForPreview(html) {
    if (!html) return "";
    if (typeof DOMPurify !== "undefined") return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] }).trim();
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || div.innerText || "").trim();
  }

  function isHtmlContent(s) {
    return typeof s === "string" && /<[a-z][\s\S]*>/i.test(s.trim());
  }

  function safeHtml(html) {
    if (!html) return "";
    if (typeof DOMPurify !== "undefined")
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["p", "br", "strong", "b", "em", "i", "u", "s", "a", "ul", "ol", "li", "h1", "h2", "h3", "blockquote", "code", "pre", "span"],
        ALLOWED_ATTR: ["href", "class", "style"],
      });
    return escapeHtml(html);
  }

  function showView(name) {
    document.getElementById("listSection").classList.toggle("hidden", name !== "list");
    formSection.classList.toggle("hidden", name !== "form");
    detailSection.classList.toggle("hidden", name !== "detail");
  }

  function setListLoading(loading) {
    if (listLoading) listLoading.classList.toggle("hidden", !loading);
  }

  function formatDate(s) {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function formatDateTime(s) {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateInput(s) {
    if (!s) return "";
    const d = new Date(s);
    return d.toISOString().slice(0, 10);
  }

  async function fetchList() {
    const params = new URLSearchParams();
    if (filterDate.value) params.set("log_date", filterDate.value);
    const res = await fetch(API + (params.toString() ? "?" + params : ""));
    if (!res.ok) throw new Error("목록 조회 실패");
    return res.json();
  }

  function renderList(data) {
    const list = data.list || [];
    const total = data.total ?? 0;
    if (list.length === 0) {
      entryList.innerHTML = `
        <li class="empty-state">
          ${filterDate.value ? "해당 날짜에 일지가 없습니다." : "작성된 업무일지가 없습니다. 새 일지를 작성해 보세요."}
        </li>
      `;
    } else {
      entryList.innerHTML = list
        .map(
          (e) => `
        <li class="entry-item" data-id="${e.id}">
          <div class="date">${formatDate(e.log_date)}</div>
          <div class="title">${escapeHtml(e.title)}</div>
          ${e.content ? `<div class="preview">${escapeHtml(stripHtmlForPreview(e.content).slice(0, 80))}${stripHtmlForPreview(e.content).length > 80 ? "…" : ""}</div>` : ""}
        </li>
      `
        )
        .join("");
    }
    listFooter.textContent = total > 0 ? `총 ${total}건` : "";
  }

  function escapeHtml(s) {
    if (!s) return "";
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  async function loadList() {
    setListLoading(true);
    try {
      const data = await fetchList();
      renderList(data);
    } catch (err) {
      entryList.innerHTML = `<li class="empty-state error">목록을 불러올 수 없습니다. (${escapeHtml(err.message)})</li>`;
      listFooter.textContent = "";
    } finally {
      setListLoading(false);
    }
  }

  function openForm(entry) {
    entryId.value = entry ? entry.id : "";
    logDate.value = entry ? formatDateInput(entry.log_date) : formatDateInput(new Date());
    titleInput.value = entry ? entry.title : "";
    if (formTitleEl) formTitleEl.textContent = entry ? "일지 수정" : "새 일지 작성";
    showView("form");
    setTimeout(() => {
      setEditorContent(entry ? entry.content || "" : "");
    }, 50);
  }

  function openDetail(entry) {
    currentEntry = entry;
    const contentRaw = entry.content || "";
    const contentHtml = isHtmlContent(contentRaw) ? safeHtml(contentRaw) : escapeHtml(contentRaw);
    entryDetail.innerHTML = `
      <div class="date">${formatDate(entry.log_date)}</div>
      <div class="title">${escapeHtml(entry.title)}</div>
      <div class="content content-richtext">${contentHtml}</div>
    `;
    if (detailMeta) {
      const parts = [];
      if (entry.created_at) parts.push("작성: " + formatDateTime(entry.created_at));
      if (entry.updated_at && entry.updated_at !== entry.created_at) parts.push("수정: " + formatDateTime(entry.updated_at));
      detailMeta.innerHTML = parts.length ? `<span class="detail-meta-text">${parts.join(" · ")}</span>` : "";
    }
    const btnEdit = detailSection.querySelector("#btnEdit");
    const btnDelete = detailSection.querySelector("#btnDelete");
    if (btnEdit) btnEdit.dataset.id = entry.id;
    if (btnDelete) btnDelete.dataset.id = entry.id;
    showView("detail");
  }

  async function saveEntry(payload) {
    const isEdit = !!payload.id;
    const url = isEdit ? `${API}/${payload.id}` : API;
    const method = isEdit ? "PUT" : "POST";
    const body = isEdit
      ? { log_date: payload.log_date, title: payload.title, content: payload.content }
      : payload;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "저장 실패");
    return data;
  }

  async function deleteEntry(id) {
    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || "삭제 실패");
  }

  function showModal(msg, onConfirm) {
    modalMessage.textContent = msg;
    modal.classList.remove("hidden");
    modalCancel.onclick = () => modal.classList.add("hidden");
    modalConfirm.onclick = () => {
      if (onConfirm) onConfirm();
      modal.classList.add("hidden");
    };
  }

  // Events
  document.getElementById("btnNew").addEventListener("click", () => openForm(null));

  document.getElementById("btnCancel").addEventListener("click", () => {
    showView("list");
    loadList();
  });

  document.getElementById("btnRefresh").addEventListener("click", loadList);

  filterDate.addEventListener("change", loadList);

  entryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = entryId.value;
    const payload = {
      log_date: logDate.value,
      title: titleInput.value.trim(),
      content: getEditorContent(),
    };
    if (id) payload.id = id;
    const prevText = btnSubmit ? btnSubmit.textContent : "";
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = "저장 중…";
    }
    try {
      await saveEntry(payload);
      showView("list");
      loadList();
    } catch (err) {
      alert(err.message);
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = prevText;
      }
    }
  });

  entryList.addEventListener("click", async (e) => {
    const item = e.target.closest(".entry-item[data-id]");
    if (!item) return;
    const id = item.dataset.id;
    setListLoading(true);
    try {
      const res = await fetch(`${API}/${id}`);
      const data = await res.json();
      if (data.success && data.entry) openDetail(data.entry);
      else alert("조회 실패");
    } catch (err) {
      alert(err.message);
    } finally {
      setListLoading(false);
    }
  });

  document.getElementById("btnBackFromDetail").addEventListener("click", () => {
    showView("list");
    loadList();
  });

  document.getElementById("btnEdit").addEventListener("click", () => {
    if (currentEntry) openForm(currentEntry);
  });

  document.getElementById("btnDelete").addEventListener("click", (e) => {
    const id = e.target.dataset.id;
    if (!id) return;
    deleteTargetId = id;
    showModal("이 일지를 삭제할까요?", async () => {
      try {
        await deleteEntry(deleteTargetId);
        showView("list");
        loadList();
      } catch (err) {
        alert(err.message);
      }
      deleteTargetId = null;
    });
  });

  modalBackdrop.addEventListener("click", () => modal.classList.add("hidden"));
  modalCancel.addEventListener("click", () => modal.classList.add("hidden"));

  // Init
  loadList();
})();
