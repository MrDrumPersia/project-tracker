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

    const getResponse = await fetch(githubUrl, {
      method: "GET",
      headers,
      cache: "no-store"
    });

    let projects = [];
    let sha = null;

    if (getResponse.ok) {

      const fileData = await getResponse.json();

      sha = fileData.sha;

      if (fileData.content) {

        const cleanContent =
          fileData.content.replace(/\n/g, "");

        const decoded =
          Buffer.from(
            cleanContent,
            "base64"
          ).toString("utf-8");

        try {

          projects = JSON.parse(decoded);

          if (!Array.isArray(projects)) {
            projects = [];
          }

        } catch (e) {

          console.error(
            "خطا در JSON:",
            e
          );

          projects = [];
        }
      }

    } else if (getResponse.status === 404) {

      projects = [];

    } else {

      const errorData =
        await getResponse.json().catch(() => ({}));

      return res.status(
        getResponse.status
      ).json({
        error:
          errorData.message ||
          "خطا در دریافت فایل از GitHub"
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

      if (
        typeof newProjects === "string"
      ) {

        try {
          newProjects =
            JSON.parse(newProjects);
        } catch (e) {

          return res.status(400).json({
            error:
              "اطلاعات ارسالی معتبر نیست."
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
         تبدیل اطلاعات به JSON
         ========================= */

      const jsonText =
        JSON.stringify(
          newProjects,
          null,
          2
        );


      /* =========================
         Base64 صحیح
         ========================= */

      const content =
        Buffer.from(
          jsonText,
          "utf-8"
        ).toString("base64");


      /* =========================
         اطلاعات آپدیت
         ========================= */

      const body = {

        message:
          "Update projects",

        content

      };

      if (sha) {
        body.sha = sha;
      }


      /* =========================
         ذخیره در GitHub
         ========================= */

      const updateResponse =
        await fetch(
          githubUrl,
          {
            method: "PUT",

            headers,

            body:
              JSON.stringify(body)
          }
        );


      const result =
        await updateResponse
          .json()
          .catch(() => ({}));


      if (!updateResponse.ok) {

        console.error(
          "GitHub Error:",
          result
        );

        return res.status(
          updateResponse.status
        ).json({
          error:
            result.message ||
            "GitHub اطلاعات را ذخیره نکرد."
        });

      }


      return res.status(200).json({

        success: true,

        message:
          "پروژه‌ها با موفقیت ذخیره شدند."

      });

    }


    /* =========================
       متد غیرمجاز
       ========================= */

    return res.status(405).json({
      error:
        "Method Not Allowed"
    });


  } catch (error) {

    console.error(
      "API ERROR:",
      error
    );

    return res.status(500).json({
      error:
        error.message ||
        "خطای داخلی سرور"
    });

  }
}
