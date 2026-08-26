export default async function handler(req, res) {

  const REPO = "MrDrumPersia/project-tracker";
  const FILE = "data/projects.json";

  const TOKEN = process.env.GH_TOKEN;

  if (!TOKEN) {
    return res.status(500).json({
      error: "توکن GH_TOKEN تنظیم نشده است."
    });
  }

  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json"
  };

  try {

    const githubUrl =
      `https://api.github.com/repos/${REPO}/contents/${FILE}`;

    const getFile = await fetch(
      githubUrl,
      {
        headers: headers,
        cache: "no-store"
      }
    );

    let projects = [];
    let sha = null;

    if (getFile.ok) {

      const fileData =
        await getFile.json();

      sha = fileData.sha;

      const content =
        Buffer.from(
          fileData.content.replace(/\n/g, ""),
          "base64"
        ).toString("utf8");

      try {

        projects =
          JSON.parse(content);

      } catch (e) {

        projects = [];

      }

    } else if (
      getFile.status !== 404
    ) {

      const error =
        await getFile.text();

      return res.status(
        getFile.status
      ).json({
        error:
          "خطا در دریافت اطلاعات از GitHub: " +
          error
      });

    }

    if (req.method === "GET") {

      return res
        .status(200)
        .json(
          Array.isArray(projects)
            ? projects
            : []
        );

    }

    if (req.method === "POST") {

      const newProjects =
        req.body;

      if (
        !Array.isArray(newProjects)
      ) {

        return res.status(400).json({
          error:
            "اطلاعات پروژه‌ها نامعتبر است."
        });

      }

      const json =
        JSON.stringify(
          newProjects,
          null,
          2
        );

      const content =
        Buffer
          .from(
            json,
            "utf8"
          )
          .toString("base64");

      const body = {
        message:
          "Update projects data",
        content:
          content
      };

      if (sha) {
        body.sha = sha;
      }

      const updateFile =
        await fetch(
          githubUrl,
          {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(body)
          }
        );

      const result =
        await updateFile.json();

      if (!updateFile.ok) {

        return res
          .status(updateFile.status)
          .json({
            error:
              result.message ||
              "خطا در ذخیره‌سازی اطلاعات"
          });

      }

      return res.status(200).json({
        success: true,
        message:
          "اطلاعات با موفقیت ذخیره شد."
      });

    }

    return res.status(405).json({
      error:
        "Method Not Allowed"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error:
        error.message ||
        "خطای داخلی سرور"
    });

  }
}
