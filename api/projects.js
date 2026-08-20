export default async function handler(req, res) {
  const REPO = "MrDrumPersia/project-tracker";
  const FILE = "data/projects.json";
  const TOKEN = process.env.GH_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({
      error: "GH_TOKEN تنظیم نشده است."
    });
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };

  const githubUrl =
    `https://api.github.com/repos/${REPO}/contents/${FILE}`;

  try {

    /* =========================
       دریافت فایل فعلی
       ========================= */

    const getFile = await fetch(githubUrl, {
      method: "GET",
      headers
    });

    let projects = [];
    let sha = null;

    if (getFile.ok) {

      const fileData = await getFile.json();

      sha = fileData.sha;

      if (fileData.content) {

        const base64Content =
          fileData.content.replace(/\s/g, "");

        const decoded =
          Buffer.from(base64Content, "base64").toString("utf-8");

        try {
          projects = JSON.parse(decoded);

          if (!Array.isArray(projects)) {
            projects = [];
          }

        } catch (e) {
          projects = [];
        }
      }

    } else if (getFile.status !== 404) {

      const errorData = await getFile.json();

      return res.status(getFile.status).json({
        error:
          errorData.message ||
          "خطا در دریافت فایل پروژه‌ها از GitHub"
      });
    }


    /* =========================
       GET
       ========================= */

    if (req.method === "GET") {

      return res.status(200).json(projects);
    }


    /* =========================
       POST
       ========================= */

    if (req.method === "POST") {

      let newProjects = req.body;

      if (typeof newProjects === "string") {

        try {
          newProjects = JSON.parse(newProjects);
        } catch (e) {
          return res.status(400).json({
            error: "اطلاعات ارسال‌شده معتبر نیست."
          });
        }
      }

      if (!Array.isArray(newProjects)) {

        return res.status(400).json({
          error:
            "اطلاعات پروژه‌ها باید به صورت آرایه باشد."
        });
      }


      /* =========================
         تبدیل به JSON
         ========================= */

      const jsonContent =
        JSON.stringify(newProjects, null, 2);

      const content =
        Buffer.from(jsonContent, "utf-8").toString("base64");


      /* =========================
         اطلاعات ذخیره
         ========================= */

      const body = {
        message: "Update projects",
        content
      };

      if (sha) {
        body.sha = sha;
      }


      /* =========================
         ذخیره در GitHub
         ========================= */

      const updateFile = await fetch(githubUrl, {

        method: "PUT",

        headers,

        body: JSON.stringify(body)

      });


      const result = await updateFile.json();


      if (!updateFile.ok) {

        console.error(
          "GitHub Save Error:",
          result
        );

        return res.status(updateFile.status).json({

          error:
            result.message ||
            "ذخیره‌سازی در GitHub انجام نشد.",

          details: result
        });
      }


      return res.status(200).json({

        success: true,

        message:
          "پروژه‌ها با موفقیت ذخیره شدند.",

        sha:
          result.content?.sha || null

      });
    }


    /* =========================
       متدهای غیرمجاز
       ========================= */

    return res.status(405).json({

      error: "Method Not Allowed"

    });

  } catch (error) {

    console.error(
      "API Error:",
      error
    );

    return res.status(500).json({

      error:
        error.message ||
        "خطای داخلی سرور"

    });
  }
}
