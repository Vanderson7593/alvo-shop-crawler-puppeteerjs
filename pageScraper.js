const scraperObject = {
  url: "https://alvo.com.br/store/index.php?route=information/information&information_id=11",
  async scraper(browser) {
    let page = await browser.newPage();
    console.log(`Navigating to ${this.url}...`);
    await page.goto(this.url, { timeout: 0 });
    await page.waitForSelector("#page");

    const departaments = await page.$$eval(
      "div.tree-menu > ul > li",
      (elements) =>
        elements.map((el) => ({
          label: el.querySelector("a").textContent,
          url: el.querySelector("a").href + "&limit=300",
          path: el.querySelector("a").href.split("&path=")[1],
        }))
    );

    const fetchUrl = ({ url, label }) =>
      new Promise(async (resolve, reject) => {
        let newPage = await browser.newPage();
        await newPage.goto(url, {
          timeout: 0,
        });

        const data = await newPage.$$eval("div.product-block", (elements) =>
          elements.map((element) => ({
            url: element.querySelector("h6 > a").href,
          }))
        );

        data.forEach((element) => {
          element["departament"] = label;
        });

        resolve(data);
        await newPage.close();
      });

    const pagePromise = ({ url, departament }) =>
      new Promise(async (resolve, reject) => {
        let newPage = await browser.newPage();
        // console.log("url", url);
        await newPage.goto(url, {
          timeout: 0,
        });

        const title = await newPage.$eval(
          ".title-product",
          (text) => text?.textContent
        );

        console.log("title", title);

        const availability = await newPage.$$eval(
          "span.text-success",
          (elements) => !!elements
        );

        const brand = await newPage.$$eval(
          "div.space-30 > ul > li",
          (elements) => elements[0]?.querySelector("a")?.textContent
        );

        const model = await newPage.$$eval(
          "div.space-30 > ul > li",
          (elements) =>
            elements[0]?.nextElementSibling?.textContent?.replace(
              "Modelo: ",
              ""
            )
        );

        const availableColors = await newPage.$$eval(
          "div#product > div.form-group.required",
          (elements) => {
            const data = [];
            let index = 0;
            if (elements[1]?.querySelector("label")?.textContent == "Cor")
              index = 1;

            if (!!elements[index]?.querySelector("div")?.children) {
              for (const element of elements[index]?.querySelector("div")
                ?.children) {
                data.push(element?.innerText);
              }
            }
            return data;
          }
        );

        const colors = await newPage.$$eval(
          "div#tab-specification > table > tbody",
          (elements) =>
            elements[0]?.textContent
              .trim()
              .replaceAll("\n", " ")
              .split(" ")
              .filter((text) => text !== "")
        );

        const availableMaterials = await newPage.$$eval(
          "div#product > div.form-group.required",
          (elements) => {
            const data = [];
            let index = 1;
            if (elements[0]?.querySelector("label")?.textContent == "Material")
              index = 0;

            if (!!elements[index]?.querySelector("div")?.children) {
              for (const element of elements[index]?.querySelector("div")
                ?.children) {
                data.push(element?.innerText);
              }
            }
            return data;
          }
        );

        const materials = await newPage.$$eval(
          "div#tab-specification > table > tbody:last-child > tr > td",
          (elements) =>
            elements
              ?.map((el, index) => {
                if (index % 2) {
                  return (
                    el?.nextElementSibling &&
                    `${el?.textContent} - ${el?.nextElementSibling?.textContent}`
                  );
                } else {
                  return el?.nextElementSibling?.textContent != ""
                    ? `${el?.textContent} - ${el?.nextElementSibling?.textContent}`
                    : el?.textContent;
                }
              })
              ?.filter((material) => material != null)
        );

        const quantity = await newPage.$eval(
          ".quantity-number > input",
          (element) => element?.value
        );

        const minimumQuantityForPurchase = await newPage.$$eval(
          "div.alert-info",
          (elements) => {
            const number = elements[0]?.innerText?.split(": ");
            return number && number[1];
          }
        );

        const tags = await newPage.$$eval("div.tags", (elements) =>
          elements?.map((el) => el?.querySelector("p > a")?.innerText)
        );

        let description = await newPage.$$eval(
          "div#tab-description",
          (elements) => elements[0]?.textContent
        );

        if (!description) {
          description = await newPage.$$eval(
            "div#tab-description > h5 > span",
            (element) => element?.textContent
          );
        }

        if (!description) {
          description = await newPage.$$eval(
            "div#tab-description > h6 > span",
            (elements) => elements[0]?.textContent
          );
        }

        let dimentions = await newPage.$$eval(
          "div#tab-specification > table > tbody",
          (elements) =>
            elements[1]
              ?.querySelector("tr")
              ?.textContent.replaceAll("\n", " ")
              .replaceAll("Tamanho", "")
              .trim()
        );

        if (!dimentions) {
          dimentions = await newPage.$$eval(
            "div#tab-description > p",
            (elements) => elements[1]?.textContent?.split(": ")[1]
          );
        }

        if (!dimentions) {
          dimentions = await newPage.$$eval(
            "div#tab-description > h5",
            (elements) => elements[1]?.textContent?.split(": ")[1]
          );
        }

        if (!dimentions) {
          dimentions = await newPage.$$eval(
            "div#tab-description > h6",
            (elements) => elements[1]?.textContent
          );
        }

        const product = {
          title,
          departament,
          availability: availability ? "Orçamento" : "Não",
          brand,
          model,
          availableColors: availableColors.join(", "),
          availableMaterials: availableMaterials.join(", "),
          quantity,
          minimumQuantityForPurchase,
          tags: tags?.join(", "),
          description,
          specificationsColors: colors?.join(", "),
          specificationsDimentions: dimentions,
          specificationsMaterials: materials?.join(", "),
          comments: [].join(", "),
        };

        resolve(product);
        await newPage.close();
      });

    // const d = await pagePromise({
    //   url: "https://alvo.com.br/store/index.php?route=product/product&path=107&product_id=736&limit=100",
    //   departament: "any",
    // });

    // console.log(await d);

    // return;

    const fetchProducts = () =>
      new Promise(async (resolve, _) => {
        const data = await departaments.map(async (departament, index) => {
          // if (index > 1) return;
          return await fetchUrl(departament);
        });
        return resolve(await Promise.all(data));
      });

    const productsRes = await fetchProducts();
    const products = productsRes.flat();
    const eightPartIndex = Math.ceil(products.length / 9);

    const firstSlice = products.splice(-eightPartIndex);
    const secondSlice = products.splice(-eightPartIndex);
    const treeSlice = products.splice(-eightPartIndex);
    const fourSlice = products.splice(-eightPartIndex);
    const fiveSlice = products.splice(-eightPartIndex);
    const sixSlice = products.splice(-eightPartIndex);
    const sevenSlice = products.splice(-eightPartIndex);
    const eightSlice = products.splice(-eightPartIndex);
    const nineSlice = products.splice(-eightPartIndex);

    // console.log("firstSlice", firstSlice.length);
    // console.log("secondSlice", secondSlice.length);
    // console.log("eightSlice", eightSlice.length);
    // console.log("nineSlice", nineSlice.length);

    let data = [];

    // for (let product of products) {
    //   const currentPageData = await pagePromise(product);
    //   console.log("product", currentPageData);
    //   data.push(currentPageData);
    // }

    const fetchList = (products) =>
      new Promise(async (resolve, _) => {
        const data = await products.map(async (product, index) => {
          // if (index > 1) return;
          return await pagePromise(product);
        });
        return resolve(await Promise.all(data));
      });

    const firstSliceFetch = Promise.all([await fetchList(firstSlice)]);
    const secondSliceFetch = Promise.all([await fetchList(secondSlice)]);
    const treeSliceFetch = Promise.all([await fetchList(treeSlice)]);
    const forthSliceFetch = Promise.all([await fetchList(fourSlice)]);
    const fivethSliceFetch = Promise.all([await fetchList(fiveSlice)]);
    const sixthSliceFetch = Promise.all([await fetchList(sixSlice)]);
    const seventhSliceFetch = Promise.all([await fetchList(sevenSlice)]);
    const eigthSliceFetch = Promise.all([await fetchList(eightSlice)]);
    const ninethSliceFetch = Promise.all([await fetchList(nineSlice)]);

    return Promise.all([
      firstSliceFetch,
      secondSliceFetch,
      treeSliceFetch,
      forthSliceFetch,
      fivethSliceFetch,
      sixthSliceFetch,
      seventhSliceFetch,
      eigthSliceFetch,
      ninethSliceFetch,
    ]);
  },
};

export default scraperObject;
