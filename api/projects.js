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

    /* =================================================
       GET
       ================================================= */

    if (req.method === "GET") {

      const response = await fetch(githubUrl, {
        method: "GET",
        headers
      });

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        return res.status(response.status).json({
          error:
            errorData.message ||
            "خطا در دریافت فایل پروژه‌ها از GitHub."
        });
      }

      const fileData = await response.json();

      if (!fileData.content) {
        return res.status(200).json([]);
      }

      const cleanContent =
        fileData.content.replace(/\n/g, "");

      const decoded =
        Buffer.from(
          cleanContent,
          "base64"
        ).toString("utf8");

      let projects = [];

      try {
        projects = JSON.parse(decoded);
      } catch (e) {
        projects = [];
      }

      return res.status(200).json(
        Array.isArray(projects)
          ? projects
          : []
      );
    }


    /* =================================================
       فقط POST مجاز است
       ================================================= */

    if (req.method !== "POST") {

      return res.status(405).json({
        error: "Method Not Allowed"
      });
    }


    /* =================================================
       بررسی اطلاعات ارسالی
       ================================================= */

    const newProjects = req.body;

    if (!Array.isArray(newProjects)) {

      return res.status(400).json({
        error:
          "اطلاعات پروژه‌ها باید به صورت آرایه باشد."
      });
    }


    /* =================================================
       دریافت SHA فعلی فایل
       ================================================= */

    const currentFileResponse =
      await fetch(githubUrl, {
        method: "GET",
        headers
      });

    let sha = null;

    if (currentFileResponse.ok) {

      const currentFile =
        await currentFileResponse.json();

      sha = currentFile.sha;

    } else if (currentFileResponse.status !== 404) {

      const errorData =
        await currentFileResponse
          .json()
          .catch(() => ({}));

      return res.status(
        currentFileResponse.status
      ).json({
        error:
          errorData.message ||
          "خطا در دریافت اطلاعات فایل GitHub."
      });
    }


    /* =================================================
       تبدیل JSON به Base64
       ================================================= */

    const jsonText =
      JSON.stringify(
        newProjects,
        null,
        2
      );

    const content =
      Buffer.from(
        jsonText,
        "utf8"
      ).toString("base64");


    /* =================================================
       ساخت درخواست GitHub
       ================================================= */

    const body = {

      message:
        "Update projects",

      content:
        content

    };

    if (sha) {
      body.sha = sha;
    }


    /* =================================================
       ذخیره در GitHub
       ================================================= */

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

      return res.status(
        updateResponse.status
      ).json({
        error:
          result.message ||
          "GitHub اجازه ذخیره فایل را نداد.",
        details: result
      });
    }


    /* =================================================
       موفق
       ================================================= */

    return res.status(200).json({

      success: true,

      message:
        "پروژه‌ها با موفقیت ذخیره شدند."

    });

  } catch (error) {

    console.error(
      "API ERROR:",
      error
    );

    return res.status(500).json({

      error:
        error.message ||
        "خطای داخلی سرور."

    });

  }
}
