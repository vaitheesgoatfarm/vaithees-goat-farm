```javascript
// Vaithees Goat Farm Management System
// English + Tamil
// Supabase authentication and farm records
//
// IMPORTANT:
// Use only your Supabase project URL and publishable/anon key.
// NEVER put a Supabase service_role key in browser code.

"use strict";

// --------------------------------------------------
// 1. SUPABASE CONFIGURATION
// --------------------------------------------------

const SUPABASE_URL = "https://leefdzbmwgzbdrswtazl.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_m9LYRTYEiN9LwZVRggRWqg_vhbVuyfx";

let sb = null;
let currentUser = null;
let currentFarmId = null;
let lang = "en";
let currentPage = "dashboard";
let renderVersion = 0;

const configured =
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_ANON_KEY.length > 0 &&
    !SUPABASE_URL.includes("PASTE_") &&
    !SUPABASE_ANON_KEY.includes("PASTE_");

if (configured && window.supabase?.createClient) {
    sb = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}

// --------------------------------------------------
// 2. NAVIGATION
// --------------------------------------------------

const pages = [
    ["dashboard", "Dashboard", "முகப்புப் பலகை"],
    ["goats", "Goats", "ஆடுகள்"],
    ["health_records", "Health & Vaccines", "ஆரோக்கியம் மற்றும் தடுப்பூசிகள்"],
    ["breeding_records", "Breeding & Pregnancy", "இனப்பெருக்கம் மற்றும் கர்ப்பம்"],
    ["birth_records", "Births & Kids", "பிறப்புகள் மற்றும் குட்டிகள்"],
    ["mortality_records", "Mortality", "இறப்புகள்"],
    ["transactions", "Purchases & Sales", "கொள்முதல் மற்றும் விற்பனை"],
    ["inventory", "Feed & Medicine Stock", "தீவனம் மற்றும் மருந்து இருப்பு"],
    ["finance_entries", "Income & Expenses", "வரவு மற்றும் செலவுகள்"]
];

// --------------------------------------------------
// 3. DATABASE FORM DEFINITIONS
// --------------------------------------------------

const schemas = {
    goats: {
        fields: [
            ["goat_id", "Goat ID", "ஆடு ID", "text", true],
            ["ear_tag", "Ear Tag", "காது அடையாள எண்", "text"],
            ["name", "Name", "பெயர்", "text"],
            ["sex", "Sex", "பாலினம்", "select", true,
                ["Male", "Female", "Unknown"]],
            ["breed", "Breed", "இனம்", "text"],
            ["date_of_birth", "Date of Birth", "பிறந்த தேதி", "date"],
            ["weight_kg", "Weight (kg)", "எடை (கிலோ)", "number"],
            ["source", "Source", "வந்த வழி", "select", false,
                ["Purchased", "Farm born"]],
            ["status", "Status", "நிலை", "select", true,
                ["Active", "Sold", "Dead"]],
            ["pen", "Shed / Pen", "கொட்டில் எண்", "text"],
            ["mother_goat_id", "Mother ID", "தாய் ஆடு ID", "text"],
            ["father_goat_id", "Father ID", "தந்தை ஆடு ID", "text"],
            ["notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    health_records: {
        fields: [
            ["goat_id", "Goat ID", "ஆடு ID", "text", true],
            ["record_type", "Record Type", "பதிவு வகை", "select", true,
                ["Vaccination", "Deworming", "Treatment", "Health check"]],
            ["record_date", "Record Date", "பதிவு தேதி", "date", true],
            ["item_name", "Vaccine / Medicine", "தடுப்பூசி / மருந்து", "text", true],
            ["dose", "Dose", "அளவு", "text"],
            ["batch_number", "Batch Number", "தொகுதி எண்", "text"],
            ["expiry_date", "Expiry Date", "காலாவதி தேதி", "date"],
            ["next_due_date", "Next Due Date", "அடுத்த தேதி", "date"],
            ["administered_by", "Veterinarian", "கால்நடை மருத்துவர்", "text"],
            ["cost", "Cost (₹)", "செலவு (₹)", "number"],
            ["outcome_notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    breeding_records: {
        fields: [
            ["female_goat_id", "Female Goat ID", "பெண் ஆடு ID", "text", true],
            ["male_goat_id", "Male Goat ID", "ஆண் ஆடு ID", "text"],
            ["mating_date", "Mating Date", "இனச்சேர்க்கை தேதி", "date", true],
            ["method", "Method", "முறை", "select", true,
                ["Natural", "Artificial insemination"]],
            ["pregnancy_check_date", "Pregnancy Check Date", "கர்ப்ப பரிசோதனை தேதி", "date"],
            ["pregnancy_result", "Pregnancy Result", "கர்ப்ப நிலை", "select", true,
                ["Pending", "Positive", "Negative"]],
            ["expected_kidding_date", "Expected Kidding Date", "எதிர்பார்க்கப்படும் குட்டி ஈனும் தேதி", "date"],
            ["notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    birth_records: {
        fields: [
            ["mother_goat_id", "Mother Goat ID", "தாய் ஆடு ID", "text", true],
            ["father_goat_id", "Father Goat ID", "தந்தை ஆடு ID", "text"],
            ["birth_date", "Birth Date", "பிறந்த தேதி", "date", true],
            ["male_kids", "Male Kids", "ஆண் குட்டிகள்", "number"],
            ["female_kids", "Female Kids", "பெண் குட்டிகள்", "number"],
            ["stillborn_kids", "Stillborn Kids", "இறந்த நிலையில் பிறந்த குட்டிகள்", "number"],
            ["birth_type", "Birth Type", "பிறப்பு வகை", "select", true,
                ["Normal", "Assisted"]],
            ["notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    mortality_records: {
        fields: [
            ["goat_id", "Goat ID", "ஆடு ID", "text", true],
            ["death_date", "Date of Death", "இறந்த தேதி", "date", true],
            ["cause", "Cause of Death", "இறப்புக்கான காரணம்", "text"],
            ["vet_findings", "Veterinarian Findings", "மருத்துவர் அறிக்கை", "textarea"],
            ["estimated_loss", "Estimated Loss (₹)", "மதிப்பிடப்பட்ட இழப்பு (₹)", "number"],
            ["disposal_details", "Disposal Details", "அகற்றிய விவரம்", "textarea"]
        ]
    },

    transactions: {
        fields: [
            ["transaction_type", "Transaction Type", "பரிவர்த்தனை வகை", "select", true,
                ["Purchase", "Sale"]],
            ["transaction_date", "Transaction Date", "பரிவர்த்தனை தேதி", "date", true],
            ["party_name", "Supplier / Buyer", "வழங்குநர் / வாங்குபவர்", "text"],
            ["phone", "Phone", "தொலைபேசி", "tel"],
            ["goat_ids", "Goat IDs", "ஆடு ID-கள்", "text"],
            ["quantity", "Quantity", "எண்ணிக்கை", "number"],
            ["total_amount", "Total Amount (₹)", "மொத்த தொகை (₹)", "number", true],
            ["amount_paid", "Amount Paid (₹)", "செலுத்திய தொகை (₹)", "number"],
            ["invoice_number", "Invoice Number", "ரசீது எண்", "text"],
            ["notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    inventory: {
        fields: [
            ["item_name", "Item Name", "பொருளின் பெயர்", "text", true],
            ["category", "Category", "வகை", "select", true,
                ["Feed", "Medicine", "Supplement", "Equipment"]],
            ["unit", "Unit", "அலகு", "text"],
            ["opening_stock", "Opening Stock", "தொடக்க இருப்பு", "number"],
            ["quantity_added", "Quantity Added", "சேர்த்த அளவு", "number"],
            ["quantity_used", "Quantity Used", "பயன்படுத்திய அளவு", "number"],
            ["reorder_level", "Low Stock Alert Level", "குறைந்தபட்ச இருப்பு", "number"],
            ["supplier", "Supplier", "வழங்குநர்", "text"],
            ["expiry_date", "Expiry Date", "காலாவதி தேதி", "date"],
            ["unit_cost", "Unit Cost (₹)", "ஒரு அலகின் விலை (₹)", "number"],
            ["notes", "Notes", "குறிப்புகள்", "textarea"]
        ]
    },

    finance_entries: {
        fields: [
            ["entry_type", "Entry Type", "பதிவு வகை", "select", true,
                ["Income", "Expense"]],
            ["entry_date", "Entry Date", "பதிவு தேதி", "date", true],
            ["category", "Category", "வகை", "text", true],
            ["amount", "Amount (₹)", "தொகை (₹)", "number", true],
            ["payment_method", "Payment Method", "பணம் செலுத்திய முறை", "select", true,
                ["Cash", "UPI", "Bank transfer", "Credit"]],
            ["description", "Description", "விவரம்", "textarea"]
        ]
    }
};

// --------------------------------------------------
// 4. GENERAL HELPERS
// --------------------------------------------------

function tr(en, ta) {
    return lang === "ta" ? ta : en;
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

function msg(id, message, isError = false) {
    const element = document.getElementById(id);

    if (!element) return;

    element.textContent = message;
    element.className = isError ? "err" : "muted";
}

function showConfig() {
    const notice = document.getElementById("configNotice");

    if (notice) {
        notice.classList.toggle("hidden", Boolean(sb));
    }
}

function setLanguage(language) {
    lang = language === "ta" ? "ta" : "en";

    document.querySelectorAll("[data-en]").forEach(element => {
        element.textContent = tr(
            element.dataset.en,
            element.dataset.ta || element.dataset.en
        );
    });

    renderNav();

    if (currentUser) {
        renderPage();
    }
}

// --------------------------------------------------
// 5. AUTHENTICATION
// --------------------------------------------------

async function signUp() {
    if (!sb) {
        alert(
            "Supabase is not configured. Check the Supabase library and app.js settings."
        );
        return;
    }

    const emailElement = document.getElementById("email");
    const passwordElement = document.getElementById("password");

    const email = emailElement?.value.trim() || "";
    const password = passwordElement?.value || "";

    if (!email || password.length < 8) {
        msg(
            "authMessage",
            "Enter a valid email and a password with at least 8 characters.",
            true
        );
        return;
    }

    try {
        const { error } = await sb.auth.signUp({
            email,
            password
        });

        if (error) throw error;

        msg(
            "authMessage",
            "Account request completed. Check your email if confirmation is enabled."
        );
    } catch (error) {
        msg("authMessage", error.message, true);
    }
}

async function signIn() {
    if (!sb) {
        alert(
            "Supabase is not configured. Check the Supabase library and app.js settings."
        );
        return;
    }

    const email = document.getElementById("email")?.value.trim() || "";
    const password = document.getElementById("password")?.value || "";

    if (!email || !password) {
        msg("authMessage", "Enter your email and password.", true);
        return;
    }

    try {
        const { data, error } = await sb.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        currentUser = data.user;

        await showApp();
    } catch (error) {
        msg("authMessage", error.message, true);
    }
}

async function signOut() {
    if (sb) {
        const { error } = await sb.auth.signOut();

        if (error) {
            console.error("Sign-out failed:", error.message);
        }
    }

    currentUser = null;
    currentFarmId = null;
    renderVersion++;

    document.getElementById("appPanel")?.classList.add("hidden");
    document.getElementById("authPanel")?.classList.remove("hidden");
    document.getElementById("signout")?.classList.add("hidden");
}

async function showApp() {
    document.getElementById("authPanel")?.classList.add("hidden");
    document.getElementById("appPanel")?.classList.remove("hidden");
    document.getElementById("signout")?.classList.remove("hidden");

    const userLabel = document.getElementById("userLabel");

    if (userLabel) {
        userLabel.textContent = currentUser?.email || "";
    }

    renderNav();

    if (currentUser) {
        await renderPage();
    }
}

// --------------------------------------------------
// 6. RESTORE EXISTING SESSION
// --------------------------------------------------

if (sb) {
    sb.auth.getSession().then(async ({ data, error }) => {
        if (error) {
            console.error("Session check failed:", error.message);
            return;
        }

        if (data?.session?.user) {
            currentUser = data.session.user;
            await showApp();
        }
    });

    sb.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
            currentUser = session.user;

            if (event === "SIGNED_IN") {
                setTimeout(() => {
                    showApp();
                }, 0);
            }
        } else if (event === "SIGNED_OUT") {
            currentUser = null;
            currentFarmId = null;

            document.getElementById("appPanel")?.classList.add("hidden");
            document.getElementById("authPanel")?.classList.remove("hidden");
            document.getElementById("signout")?.classList.add("hidden");
        }
    });
}

// --------------------------------------------------
// 7. NAVIGATION FUNCTIONS
// --------------------------------------------------

function renderNav() {
    const nav = document.getElementById("nav");

    if (!nav) return;

    nav.innerHTML = pages.map(([id, en, ta]) => `
        <button
            type="button"
            class="${currentPage === id ? "on" : ""}"
            onclick="goPage('${id}')">
            ${esc(tr(en, ta))}
        </button>
    `).join("");
}

function goPage(page) {
    if (page !== "dashboard" && !schemas[page]) {
        console.warn("Unknown page:", page);
        return;
    }

    currentPage = page;

    renderNav();
    renderPage();
}

// --------------------------------------------------
// 8. FORM GENERATION
// --------------------------------------------------

function fieldHTML(field) {
    const [name, enLabel, taLabel, type, required, options] = field;

    const req = required ? "required" : "";
    const label = tr(enLabel, taLabel);

    let input = "";

    if (type === "select") {
        input = `
            <select name="${esc(name)}" ${req}>
                <option value="">${esc(
                    tr("Select an option", "ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்")
                )}</option>

                ${options.map(option => `
                    <option value="${esc(option)}">
                        ${esc(option)}
                    </option>
                `).join("")}
            </select>
        `;
    } else if (type === "textarea") {
        input = `
            <textarea
                name="${esc(name)}"
                ${req}
                rows="3"></textarea>
        `;
    } else {
        input = `
            <input
                name="${esc(name)}"
                type="${esc(type)}"
                ${req}
                ${type === "number" ? 'step="any"' : ""}
                ${type === "number" ? 'min="0"' : ""}
            >
        `;
    }

    return `
        <div class="field">
            <label for="field-${esc(name)}">
                ${esc(label)}${required ? " *" : ""}
            </label>

            ${input.replace(
                `name="${esc(name)}"`,
                `id="field-${esc(name)}" name="${esc(name)}"`
            )}
        </div>
    `;
}

function formHTML(table) {
    const schema = schemas[table];

    if (!schema) return "";

    return `
        <section class="panel">
            <h3>${tr("Add Record", "புதிய பதிவைச் சேர்க்கவும்")}</h3>

            <form onsubmit="saveRow(event, '${table}')">
                <div class="fields">
                    ${schema.fields.map(fieldHTML).join("")}
                </div>

                <div class="row" style="margin-top:12px">
                    <button type="submit">
                        ${tr("Save Record", "பதிவைச் சேமிக்கவும்")}
                    </button>

                    <span id="formMessage" class="muted"></span>
                </div>
            </form>
        </section>
    `;
}

// --------------------------------------------------
// 9. FARM MEMBERSHIP
// --------------------------------------------------

async function getFarmId() {
    if (!sb || !currentUser) {
        return null;
    }

    if (currentFarmId) {
        return currentFarmId;
    }

    const { data, error } = await sb
        .from("farm_members")
        .select("farm_id")
        .eq("user_id", currentUser.id)
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Farm membership lookup failed:", error.message);
        throw error;
    }

    currentFarmId = data?.farm_id || null;

    return currentFarmId;
}

// --------------------------------------------------
// 10. READ RECORDS
// --------------------------------------------------

async function getRows(table) {
    if (!sb || !currentUser) {
        throw new Error("Please sign in first.");
    }

    const farmId = await getFarmId();

    if (!farmId) {
        throw new Error(
            "No farm membership found. Set up your farm_members record first."
        );
    }

    const { data, error } = await sb
        .from(table)
        .select("*")
        .eq("farm_id", farmId)
        .order("created_at", { ascending: false })
        .limit(500);

    if (error) throw error;

    return data || [];
}

// --------------------------------------------------
// 11. TABLE DISPLAY
// --------------------------------------------------

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
        return `
            <p class="muted">
                ${tr(
                    "No records yet. Add your first record.",
                    "இன்னும் பதிவுகள் இல்லை. முதல் பதிவைச் சேர்க்கவும்."
                )}
            </p>
        `;
    }

    const keys = schemas[table].fields.map(field => field[0]);

    return `
        <div class="tablewrap">
            <table>
                <thead>
                    <tr>
                        ${keys.map(key => `
                            <th>${esc(key.replace(/_/g, " "))}</th>
                        `).join("")}
                    </tr>
                </thead>

                <tbody>
                    ${rows.map(row => `
                        <tr>
                            ${keys.map(key => `
                                <td>${cell(row[key])}</td>
                            `).join("")}
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// --------------------------------------------------
// 12. DASHBOARD
// --------------------------------------------------

async function renderDashboard(view, version) {
    view.innerHTML = `
        <div class="grid" id="stats">
            <div class="stat">
                <span class="muted">${tr("Loading...", "ஏற்றப்படுகிறது...")}</span>
            </div>
        </div>

        <section class="panel">
            <h3>${tr("Getting Started", "தொடங்குவது")}</h3>

            <p class="muted">
                ${tr(
                    "Register your goats first. Then add health, breeding, birth, mortality, purchase, sales and financial records.",
                    "முதலில் உங்கள் ஆடுகளைப் பதிவு செய்யவும். பின்னர் ஆரோக்கியம், இனப்பெருக்கம், பிறப்பு, இறப்பு, கொள்முதல், விற்பனை மற்றும் நிதிப் பதிவுகளைச் சேர்க்கவும்."
                )}
            </p>
        </section>
    `;

    try {
        const [goats, health, breeding, finance] = await Promise.all([
            getRows("goats"),
            getRows("health_records"),
            getRows("breeding_records"),
            getRows("finance_entries")
        ]);

        if (version !== renderVersion) return;

        const stats = document.getElementById("stats");

        if (!stats) return;

        const cards = [
            [
                tr("Active Goats", "உயிருள்ள ஆடுகள்"),
                goats.filter(goat => goat.status === "Active").length
            ],
            [
                tr("Male Goats", "ஆண் ஆடுகள்"),
                goats.filter(goat => goat.sex === "Male" && goat.status === "Active").length
            ],
            [
                tr("Female Goats", "பெண் ஆடுகள்"),
                goats.filter(goat => goat.sex === "Female" && goat.status === "Active").length
            ],
            [
                tr("Health Records", "ஆரோக்கியப் பதிவுகள்"),
                health.length
            ],
            [
                tr("Breeding Records", "இனப்பெருக்கப் பதிவுகள்"),
                breeding.length
            ],
            [
                tr("Finance Entries", "நிதிப் பதிவுகள்"),
                finance.length
            ]
        ];

        stats.innerHTML = cards.map(([label, count]) => `
            <div class="stat">
                <span class="muted">${esc(label)}</span>
                <strong>${count}</strong>
            </div>
        `).join("");

    } catch (error) {
        if (version !== renderVersion) return;

        view.innerHTML = `
            <div class="notice">
                ${tr("Dashboard error", "முகப்புப் பலகை பிழை")}:
                ${esc(error.message)}
            </div>
        `;
    }
}

// --------------------------------------------------
// 13. RENDER PAGE
// --------------------------------------------------

async function renderPage() {
    const version = ++renderVersion;

    const title = pages.find(page => page[0] === currentPage);

    const pageTitle = document.getElementById("pageTitle");
    const view = document.getElementById("view");

    if (!view) return;

    if (pageTitle) {
        pageTitle.textContent = title
            ? tr(title[1], title[2])
            : tr("Dashboard", "முகப்புப் பலகை");
    }

    if (!sb || !currentUser) {
        view.innerHTML = `
            <div class="notice">
                ${tr(
                    "Please sign in to access your farm records.",
                    "உங்கள் பண்ணைப் பதிவுகளைப் பார்க்க உள்நுழையவும்."
                )}
            </div>
        `;
        return;
    }

    if (currentPage === "dashboard") {
        await renderDashboard(view, version);
        return;
    }

    if (!schemas[currentPage]) {
        view.innerHTML = `
            <div class="notice">
                ${tr("Page not found.", "பக்கம் கிடைக்கவில்லை.")}
            </div>
        `;
        return;
    }

    view.innerHTML = formHTML(currentPage) + `
        <section class="panel">
            <div class="row" style="justify-content:space-between">
                <h3>${tr("Saved Records", "சேமிக்கப்பட்ட பதிவுகள்")}</h3>

                <button
                    type="button"
                    class="secondary"
                    onclick="refreshCurrent()">
                    ${tr("Refresh", "புதுப்பிக்கவும்")}
                </button>
            </div>

            <div id="rows">
                <p class="muted">${tr("Loading...", "ஏற்றப்படுகிறது...")}</p>
            </div>
        </section>
    `;

    try {
        const rows = await getRows(currentPage);

        if (version !== renderVersion) return;

        const rowsElement = document.getElementById("rows");

        if (rowsElement) {
            rowsElement.innerHTML = tableHTML(rows, currentPage);
        }

    } catch (error) {
        if (version !== renderVersion) return;

        const rowsElement = document.getElementById("rows");

        if (rowsElement) {
            rowsElement.innerHTML = `
                <div class="notice">
                    ${tr("Could not load records", "பதிவுகளை ஏற்ற முடியவில்லை")}:
                    ${esc(error.message)}
                </div>
            `;
        }
    }
}

async function refreshCurrent() {
    await renderPage();
}

// --------------------------------------------------
// 14. SAVE RECORD
// --------------------------------------------------

async function saveRow(event, table) {
    event.preventDefault();

    if (!sb || !currentUser) {
        msg("formMessage", "Please sign in again.", true);
        return;
    }

    if (!schemas[table]) {
        msg("formMessage", "Invalid record type.", true);
        return;
    }

    const form = event.currentTarget;

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        const formData = new FormData(form);
        const row = Object.fromEntries(formData.entries());

        const farmId = await getFarmId();

        if (!farmId) {
            throw new Error(
                "No farm membership found. Please configure farm_members in Supabase."
            );
        }

        row.farm_id = farmId;
        row.created_by = currentUser.id;

        const numericFields = new Set([
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
            "estimated_loss",
            "amount"
        ]);

        for (const key of Object.keys(row)) {
            if (row[key] === "") {
                row[key] = null;
            } else if (numericFields.has(key)) {
                const number = Number(row[key]);

                if (!Number.isFinite(number)) {
                    throw new Error(`Invalid number in ${key}.`);
                }

                row[key] = number;
            }
        }

        msg("formMessage", tr("Saving...", "சேமிக்கப்படுகிறது..."));

        const { error } = await sb
            .from(table)
            .insert(row);

        if (error) throw error;

        form.reset();

        msg(
            "formMessage",
            tr("Saved successfully.", "வெற்றிகரமாகச் சேமிக்கப்பட்டது.")
        );

        await renderPage();

    } catch (error) {
        console.error("Record save failed:", error);

        msg(
            "formMessage",
            error.message || "Unable to save the record.",
            true
        );

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

// --------------------------------------------------
// 15. INITIALIZATION
// --------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
    showConfig();

    if (!sb) {
        console.error(
            "Supabase is not available. Check the Supabase CDN script and configuration."
        );
    }
});
```
