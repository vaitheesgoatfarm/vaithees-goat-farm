```javascript
// Vaithees Goat Farm Manager
// Use only the Supabase project URL and publishable/anon key.
// NEVER put a service_role key in browser code.

const SUPABASE_URL = "https://leefdzbmwgzbdrswtazl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_m9LYRTYEiN9LwZVRggRWqg_vhbVuyfx";

const configured =
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("PASTE_") &&
    !SUPABASE_ANON_KEY.includes("PASTE_");

let sb = null;

if (configured && window.supabase) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let currentUser = null;
let lang = "en";
let currentPage = "dashboard";

const pages = [
    ["dashboard", "Dashboard", "முகப்புப் பலகை"],
    ["goats", "Goats", "ஆடுகள்"],
    ["health_records", "Health & vaccines", "ஆரோக்கியம் & தடுப்பூசி"],
    ["breeding_records", "Mating & pregnancy", "இனச்சேர்க்கை & கர்ப்பம்"],
    ["birth_records", "Births & kids", "பிறப்பு & குட்டிகள்"],
    ["mortality_records", "Mortality", "இறப்பு"],
    ["transactions", "Purchases & sales", "கொள்முதல் & விற்பனை"],
    ["inventory", "Feed & medicine stock", "தீவனம் & மருந்து இருப்பு"],
    ["finance_entries", "Income & expenses", "வரவு & செலவு"]
];

const schemas = {
    goats: {
        fields: [
            ["goat_id", "Goat ID", "text", true],
            ["ear_tag", "Ear tag", "text"],
            ["name", "Name", "text"],
            ["sex", "Sex", "select", true, ["Male", "Female", "Unknown"]],
            ["breed", "Breed", "text"],
            ["date_of_birth", "Date of birth", "date"],
            ["weight_kg", "Weight (kg)", "number"],
            ["source", "Source", "select", false, ["Purchased", "Farm born"]],
            ["status", "Status", "select", true, ["Active", "Sold", "Dead"]],
            ["pen", "Shed / pen", "text"],
            ["mother_goat_id", "Mother ID", "text"],
            ["father_goat_id", "Father ID", "text"],
            ["notes", "Notes", "textarea"]
        ]
    },

    health_records: {
        fields: [
            ["goat_id", "Goat ID", "text", true],
            ["record_type", "Type", "select", true, ["Vaccination", "Deworming", "Treatment", "Health check"]],
            ["record_date", "Date", "date", true],
            ["item_name", "Vaccine / medicine", "text", true],
            ["dose", "Dose", "text"],
            ["batch_number", "Batch / lot", "text"],
            ["expiry_date", "Expiry date", "date"],
            ["next_due_date", "Next due date", "date"],
            ["administered_by", "Vet / administered by", "text"],
            ["cost", "Cost (₹)", "number"],
            ["outcome_notes", "Notes", "textarea"]
        ]
    },

    breeding_records: {
        fields: [
            ["female_goat_id", "Female goat ID", "text", true],
            ["male_goat_id", "Buck ID", "text"],
            ["mating_date", "Mating date", "date", true],
            ["method", "Method", "select", true, ["Natural", "Artificial insemination"]],
            ["pregnancy_check_date", "Pregnancy check date", "date"],
            ["pregnancy_result", "Result", "select", true, ["Pending", "Positive", "Negative"]],
            ["expected_kidding_date", "Expected kidding date", "date"],
            ["notes", "Notes", "textarea"]
        ]
    },

    birth_records: {
        fields: [
            ["mother_goat_id", "Mother ID", "text", true],
            ["father_goat_id", "Father ID", "text"],
            ["birth_date", "Birth date", "date", true],
            ["male_kids", "Male kids", "number"],
            ["female_kids", "Female kids", "number"],
            ["stillborn_kids", "Stillborn", "number"],
            ["birth_type", "Birth type", "select", true, ["Normal", "Assisted"]],
            ["notes", "Survival / notes", "textarea"]
        ]
    },

    mortality_records: {
        fields: [
            ["goat_id", "Goat ID", "text", true],
            ["death_date", "Date of death", "date", true],
            ["cause", "Cause (suspected / confirmed)", "text"],
            ["vet_findings", "Vet / post-mortem findings", "textarea"],
            ["estimated_loss", "Estimated value lost (₹)", "number"],
            ["disposal_details", "Disposal details", "textarea"]
        ]
    },

    transactions: {
        fields: [
            ["transaction_type", "Type", "select", true, ["Purchase", "Sale"]],
            ["transaction_date", "Date", "date", true],
            ["party_name", "Supplier / buyer", "text"],
            ["phone", "Phone", "tel"],
            ["goat_ids", "Goat IDs (comma separated)", "text"],
            ["quantity", "Quantity", "number"],
            ["total_amount", "Total amount (₹)", "number", true],
            ["amount_paid", "Amount paid (₹)", "number"],
            ["invoice_number", "Invoice / receipt", "text"],
            ["notes", "Notes", "textarea"]
        ]
    },

    inventory: {
        fields: [
            ["item_name", "Item name", "text", true],
            ["category", "Category", "select", true, ["Feed", "Medicine", "Supplement", "Equipment"]],
            ["unit", "Unit", "text"],
            ["opening_stock", "Opening stock", "number"],
            ["quantity_added", "Quantity added", "number"],
            ["quantity_used", "Quantity used", "number"],
            ["reorder_level", "Low-stock threshold", "number"],
            ["supplier", "Supplier", "text"],
            ["expiry_date", "Expiry date", "date"],
            ["unit_cost", "Unit cost (₹)", "number"],
            ["notes", "Notes", "textarea"]
        ]
    },

    finance_entries: {
        fields: [
            ["entry_type", "Type", "select", true, ["Income", "Expense"]],
            ["entry_date", "Date", "date", true],
            ["category", "Category / reason", "text", true],
            ["amount", "Amount (₹)", "number", true],
            ["payment_method", "Payment method", "select", true, ["Cash", "UPI", "Bank transfer", "Credit"]],
            ["description", "Description", "textarea"]
        ]
    }
};

function tr(en, ta) {
    return lang === "ta" ? ta : en;
}

function setLanguage(language) {
    lang = language;

    document.querySelectorAll("[data-en]").forEach(element => {
        element.textContent = tr(element.dataset.en, element.dataset.ta);
    });

    renderNav();

    if (currentUser) {
        renderPage();
    }
}

function msg(id, message, isError = false) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = message;
        element.className = isError ? "err" : "muted";
    }
}

function showConfig() {
    const notice = document.getElementById("configNotice");

    if (notice) {
        notice.classList.toggle("hidden", configured && !!sb);
    }
}

showConfig();

async function signUp() {
    if (!sb) {
        return alert("Supabase is not configured. Check the Supabase library and app.js settings.");
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || password.length < 8) {
        msg("authMessage", "Enter your email and a password with at least 8 characters.", true);
        return;
    }

    const { error } = await sb.auth.signUp({ email, password });

    msg(
        "authMessage",
        error ? error.message : "Account request sent. Check your email if confirmation is enabled.",
        !!error
    );
}

async function signIn() {
    if (!sb) {
        return alert("Supabase is not configured. Check the Supabase library and app.js settings.");
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { data, error } = await sb.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        msg("authMessage", error.message, true);
        return;
    }

    currentUser = data.user;
    showApp();
}

async function signOut() {
    if (sb) {
        await sb.auth.signOut();
    }

    currentUser = null;

    document.getElementById("appPanel")?.classList.add("hidden");
    document.getElementById("authPanel")?.classList.remove("hidden");
    document.getElementById("signout")?.classList.add("hidden");
}

function showApp() {
    document.getElementById("authPanel")?.classList.add("hidden");
    document.getElementById("appPanel")?.classList.remove("hidden");
    document.getElementById("signout")?.classList.remove("hidden");

    const userLabel = document.getElementById("userLabel");

    if (userLabel) {
        userLabel.textContent = currentUser?.email || "";
    }

    renderNav();
    renderPage();
}

if (sb) {
    sb.auth.getSession().then(({ data, error }) => {
        if (error) {
            console.error("Session check failed:", error.message);
            return;
        }

        if (data.session) {
            currentUser = data.session.user;
            showApp();
        }
    });

    sb.auth.onAuthStateChange((_event, session) => {
        if (session) {
            currentUser = session.user;
            showApp();
        }
    });
}

function renderNav() {
    const nav = document.getElementById("nav");

    if (!nav) return;

    nav.innerHTML = pages.map(([id, en, ta]) => `
        <button class="${currentPage === id ? "on" : ""}"
                onclick="goPage('${id}')">
            ${tr(en, ta)}
        </button>
    `).join("");
}

function goPage(page) {
    currentPage = page;
    renderNav();
    renderPage();
}

function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function fieldHTML(field) {
    const [name, label, type, required, options] = field;
    const req = required ? "required" : "";
    let input;

    if (type === "select") {
        input = `
            <select name="${name}" ${req}>
                ${options.map(option =>
                    `<option value="${esc(option)}">${esc(option)}</option>`
                ).join("")}
            </select>`;
    } else if (type === "textarea") {
        input = `<textarea name="${name}" ${req}></textarea>`;
    } else {
        input = `<input name="${name}" type="${type}" ${req}
                    ${type === "number" ? 'step="any" min="0"' : ""}>`;
    }

    const tamilLabel = label === "Goat ID"
        ? "ஆடு ID"
        : label === "Date"
            ? "தேதி"
            : label;

    return `
        <div class="field">
            <label>${tr(label, tamilLabel)}</label>
            ${input}
        </div>`;
}

function formHTML(table) {
    const schema = schemas[table];

    return `
        <section class="panel">
            <h3>${tr("Add record", "பதிவு சேர்")}</h3>

            <form onsubmit="saveRow(event, '${table}')">
                <div class="fields">
                    ${schema.fields.map(fieldHTML).join("")}
                </div>

                <div class="row" style="margin-top:12px">
                    <button type="submit">${tr("Save record", "பதிவைச் சேமி")}</button>
                    <span class="muted" id="formMessage"></span>
                </div>
            </form>
        </section>`;
}

async function getRows(table) {
    if (!sb || !currentUser) {
        throw new Error("Please sign in first.");
    }

    const { data, error } = await sb
        .from(table)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

    if (error) throw error;

    return data || [];
}

function cell(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    if (typeof value === "object") {
        return esc(JSON.stringify(value));
    }

    return esc(value);
}

function tableHTML(rows, table) {
    if (!rows.length) {
        return `<p class="muted">${tr(
            "No records yet. Add your first record.",
            "இன்னும் பதிவுகள் இல்லை. முதல் பதிவைச் சேர்க்கவும்."
        )}</p>`;
    }

    const keys = schemas[table].fields.map(field => field[0]);

    return `
        <div class="tablewrap">
            <table>
                <thead>
                    <tr>${keys.map(key =>
                        `<th>${esc(key.replaceAll("_", " "))}</th>`
                    ).join("")}</tr>
                </thead>
                <tbody>
                    ${rows.map(row => `
                        <tr>${keys.map(key =>
                            `<td>${cell(row[key])}</td>`
                        ).join("")}</tr>
                    `).join("")}
                </tbody>
            </table>
        </div>`;
}

async function renderPage() {
    const title = pages.find(page => page[0] === currentPage);
    const pageTitle = document.getElementById("pageTitle");
    const view = document.getElementById("view");

    if (!view) return;

    if (pageTitle) {
        pageTitle.textContent = tr(
            title?.[1] || "Dashboard",
            title?.[2] || "முகப்புப் பலகை"
        );
    }

    if (!sb || !currentUser) {
        view.innerHTML = `<div class="notice">Please sign in to access your farm records.</div>`;
        return;
    }

    if (currentPage === "dashboard") {
        view.innerHTML = `
            <div class="grid" id="stats"></div>
            <section class="panel">
                <h3>${tr("Getting started", "தொடங்குவது")}</h3>
                <p class="muted">
                    ${tr(
                        "Register goats first, then link health, breeding, birth, sale and mortality records using each goat ID. Records are shared through your Supabase database.",
                        "முதலில் ஆடுகளைப் பதிவு செய்து, ஒவ்வொரு ஆடு ID-ஐப் பயன்படுத்தி ஆரோக்கியம், இனப்பெருக்கம், பிறப்பு, விற்பனை மற்றும் இறப்பு பதிவுகளை இணைக்கவும்."
                    )}
                </p>
            </section>`;

        try {
            const [goats, health, breeding, finance] = await Promise.all([
                getRows("goats"),
                getRows("health_records"),
                getRows("breeding_records"),
                getRows("finance_entries")
            ]);

            const stats = document.getElementById("stats");

            if (stats) {
                stats.innerHTML = [
                    [tr("Live goats", "உயிருள்ள ஆடுகள்"), goats.filter(goat => goat.status === "Active").length],
                    [tr("Health records", "சுகாதாரப் பதிவுகள்"), health.length],
                    [tr("Breeding records", "இனப்பெருக்கப் பதிவுகள்"), breeding.length],
                    [tr("Finance entries", "கணக்குப் பதிவுகள்"), finance.length]
                ].map(([label, count]) => `
                    <div class="stat">
                        <span class="muted">${label}</span>
                        <strong>${count}</strong>
                    </div>
                `).join("");
            }
        } catch (error) {
            view.innerHTML = `<div class="notice">Could not load dashboard: ${esc(error.message)}</div>`;
        }

        return;
    }

    if (!schemas[currentPage]) return;

    view.innerHTML =
        formHTML(currentPage) +
        `<section class="panel">
            <div class="row" style="justify-content:space-between">
                <h3>${tr("Saved records", "சேமித்த பதிவுகள்")}</h3>
                <button class="secondary" onclick="renderPage()">${tr("Refresh", "புதுப்பி")}</button>
            </div>
            <div id="rows"><p class="muted">Loading…</p></div>
        </section>`;

    try {
        const rows = await getRows(currentPage);
        const rowsElement = document.getElementById("rows");

        if (rowsElement) {
            rowsElement.innerHTML = tableHTML(rows, currentPage);
        }
    } catch (error) {
        const rowsElement = document.getElementById("rows");

        if (rowsElement) {
            rowsElement.innerHTML =
                `<div class="notice">Could not load records: ${esc(error.message)}. Check database permissions and table structure.</div>`;
        }
    }
}

async function getFarmId() {
    if (!sb || !currentUser) {
        return null;
    }

    const { data, error } = await sb
        .from("farm_members")
        .select("farm_id")
        .eq("user_id", currentUser.id)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Farm membership lookup failed:", error.message);
        return null;
    }

    return data?.farm_id || null;
}

async function saveRow(event, table) {
    event.preventDefault();

    if (!sb || !currentUser) {
        msg("formMessage", "Please sign in again.", true);
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const row = Object.fromEntries(formData.entries());

    const farmId = await getFarmId();

    if (!farmId) {
        msg(
            "formMessage",
            "No farm membership found. Check the farm_members table and permissions.",
            true
        );
        return;
    }

    row.farm_id = farmId;
    row.created_by = currentUser.id;

    const numericFields = [
        "weight_kg",
        "cost",
        "quantity",
        "total_amount",
        "amount_paid",
        "opening_stock",
        "quantity_added",
        "quantity_used",
        "reorder_level",
        "unit_cost",
        "male_kids",
        "female_kids",
        "stillborn_kids",
        "estimated_loss"
    ];

    for (const key of Object.keys(row)) {
        if (row[key] === "") {
            row[key] = null;
        } else if (numericFields.includes(key) && row[key] !== null) {
            row[key] = Number(row[key]);
        }
    }

    msg("formMessage", "Saving…");

    const { error } = await sb
        .from(table)
        .insert(row);

    if (error) {
        console.error("Record save failed:", error);
        msg("formMessage", error.message, true);
        return;
    }

    form.reset();

    msg("formMessage", tr(
        "Saved successfully.",
        "வெற்றிகரமாகச் சேமிக்கப்பட்டது."
    ));

    await renderPage();
}

async function refreshCurrent() {
    await renderPage();
}
```
