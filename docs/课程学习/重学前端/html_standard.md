## HTML 标准

我们采用 WHATWG 的 living standard 标准，我们先来看看标准是如何描述一个标签的，
这里我们看到，有下面这些内容。

```
Categories:
    Flow content.
    Phrasing content.
    Embedded content.
    If the element has a controls attribute: Interactive content.
    Palpable content.
Contexts in which this element can be used:
    Where embedded content is expected.
Content model:
    If the element has a src attribute: zero or more track elements, then transparent, but with no media element descendants.
    If the element does not have a src attribute: zero or more source elements, then zero or more track elements, then transparent, but with no media element descendants.
Tag omission in text/html:
    Neither tag is omissible.
Content attributes:
    Global attributes
    src — Address of the resource
    crossorigin — How the element handles crossorigin requests
    poster — Poster frame to show prior to video playback
    preload — Hints how much buffering the media resource will likely need
    autoplay — Hint that the media resource can be started automatically when the page is loaded
    playsinline — Encourage the user agent to display video content within the element's playback area
    loop — Whether to loop the media resource
    muted — Whether to mute the media resource by default
    controls — Show user agent controls
    width — Horizontal dimension
    height — Vertical dimension
DOM interface:
    [Exposed=Window, HTMLConstructor]
    interface HTMLVideoElement : HTMLMediaElement {
      [CEReactions] attribute unsigned long width;
      [CEReactions] attribute unsigned long height;
      readonly attribute unsigned long videoWidth;
      readonly attribute unsigned long videoHeight;
      [CEReactions] attribute USVString poster;
      [CEReactions] attribute boolean playsInline;
    };
```

我们看到，这里的描述分为 6 个部分，有下面这些内容。

- Categories：标签所属的分类。
- Contexts in which this element can be used：标签能够用在哪里。
- Content model：标签的内容模型。
- Tag omission in text/html：标签是否可以省略。
- Content attributes：内容属性。
- DOM interface：用 WebIDL 定义的元素类型接口。
