# 绘制部件类

每一个绘图元素可能都有很多绘图部件组成，在插件元素组件中需要频繁对这些绘图元素进行重绘，重绘的时候需要对上一次的元素做 `remove` 操作，所以我们通常会维护一个各个绘图部件的 g 实例，基于这样的处理为了避免绘图元素组件插件元素组件声明很多 `xxxG`，当然还有一些绘图部件的一些通用处理，我们设计了 `generator`，用户处理插件元素部件的绘制，每一个插件元素的渲染由 `N` 个 `generator` 组成，这个 `generator` 可以进行一些条件判断、根据参数完成部件绘制、绘制完成后将 `g` 存起来并且 `append` 到指定父元素上、在重绘时可以清理上一次的绘制。

在不同的画图插件中也存在一些通用的逻辑，比如元素的选中状态，这类逻辑可以被有选择的封装到 `@plait/common` 中，不同业务不通的处理逻辑通过 `Options` 进行自定义。
