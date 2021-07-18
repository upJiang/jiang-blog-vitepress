<template>
  <!-- <footer class="page-edit">
    sdfa
    <a
      v-if="editLink"
      :href="editLink"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ editLinkText }}
      <OutboundLink />
    </a>
  </footer> -->
  <div>
    <p class="platform">
      <a href="https://beian.miit.gov.cn/#/Integrated/index">
        粤ICP备18079096号
      </a>
    </p>
  </div>
</template>

<script src="./PageEdit"></script>

<style>
.platform {
  text-align: center;
}
.platform > a {
  color: #2196f3;
}
.page-edit {
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}

.page-edit a {
  color: var(--text-color);
  margin-right: 0.25rem;
  display: inline-block;
  margin: 0 0.2rem;
}
.imgIcon {
  width: 1.5rem;
  border-radius: 50%;
}
</style>
